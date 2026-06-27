import { useEffect, useRef, useState, useCallback } from 'react';
import { ServerMessage, ClientMessage } from '../types/protocol';

export type ActiveTool = {
  call_id: string;
  name: string;
  args: Record<string, unknown>;
} | null;

export type EventLog = {
  id: string;
  type: string;
  summary: string;
  raw: any;
  count: number;
};

const SOCKET_URL = 'ws://localhost:4747/ws';

export function useAgentSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [logs, setLogs] = useState<EventLog[]>([]);

  
  // NEW: State to hold the massive AI brain dump
  const [contextSnapshot, setContextSnapshot] = useState<Record<string, unknown> | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  
  // NEW: Chaos Mode Survival State
  const nextSeqRef = useRef<number>(1);
  const bufferRef = useRef<Map<number, ServerMessage>>(new Map());
  const isIntentionalDisconnect = useRef<boolean>(false);

  const sendMessage = useCallback((msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(SOCKET_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      
      // RECOVERY: If we already processed messages, ask the server to catch us up!
      if (nextSeqRef.current > 1) {
        console.log(`Reconnected! Requesting resume from seq: ${nextSeqRef.current - 1}`);
        ws.send(JSON.stringify({ type: 'RESUME', last_seq: nextSeqRef.current - 1 }));
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      
      // AUTO-RECONNECT: If the server dropped us (not a manual close), try again in 1 second
      if (!isIntentionalDisconnect.current) {
        console.warn("Connection lost. Reconnecting in 1s...");
        setTimeout(connect, 1000);
      }
    };

   ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        
        // 1. NETWORK LAYER SURVIVAL: Always bounce PINGs instantly
        if (message.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', echo: message.challenge || "" }));
        }

        // 2. NETWORK LAYER SURVIVAL: Acknowledge tools instantly!
        // We MUST send this back immediately to satisfy the server's 2-second timeout.
        // We do this before the sequence buffer traps it.
        if (message.type === 'TOOL_CALL') {
          ws.send(JSON.stringify({ type: 'TOOL_ACK', call_id: message.call_id }));
        }

        // 3. CHAOS FILTER: Ignore duplicate sequences sent by the server
        if (message.seq < nextSeqRef.current) {
          console.log(`Ignored duplicate message seq: ${message.seq}`);
          return;
        }

        // 4. THE WAITING ROOM: Put the message in the buffer
        bufferRef.current.set(message.seq, message);

        // 5. THE UI PROCESSOR: Only render to the screen when in perfect order
        while (bufferRef.current.has(nextSeqRef.current)) {
          const msgToProcess = bufferRef.current.get(nextSeqRef.current)!;
          bufferRef.current.delete(nextSeqRef.current);

          // Apply to Timeline Logs
          setLogs((prevLogs) => {
            const newLogs = [...prevLogs];
            const lastLog = newLogs[newLogs.length - 1];
            if (msgToProcess.type === 'TOKEN' && lastLog?.type === 'TOKEN') {
              lastLog.count += 1;
              lastLog.summary = `Streamed ${lastLog.count} tokens`;
              return newLogs;
            }
            newLogs.push({
              id: Date.now().toString() + msgToProcess.seq,
              type: msgToProcess.type,
              summary: msgToProcess.type === 'TOKEN' ? 'Streamed 1 token' : `Received ${msgToProcess.type}`,
              raw: msgToProcess,
              count: 1
            });
            return newLogs.slice(-50);
          });

          // Apply to UI State
          if (msgToProcess.type === 'TOKEN') {
            setStreamedText((prev) => prev + msgToProcess.text);
          }

          if (msgToProcess.type === 'TOOL_CALL') {
            // We still update the UI to show the card sequentially, 
            // but we REMOVED the ws.send(TOOL_ACK) from here since we did it at Step 2!
            setActiveTool({
              call_id: msgToProcess.call_id,
              name: msgToProcess.tool_name,
              args: msgToProcess.args
            });
          }

          if (msgToProcess.type === 'TOOL_RESULT') {
            setActiveTool(null);
          }
          if (msgToProcess.type === 'CONTEXT_SNAPSHOT') {
            setContextSnapshot(msgToProcess.data);
          }

          // Advance our expected sequence number
          nextSeqRef.current += 1;
        }

      } catch (error) {
        console.error("Failed to parse incoming message:", error);
      }
    };
  }, []);

  // Initial connection
  useEffect(() => {
    isIntentionalDisconnect.current = false;
    connect();

    return () => {
      isIntentionalDisconnect.current = true;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Expose a manual disconnect function if needed
  const resetStream = useCallback(() => {
    setStreamedText('');
    setLogs([]);
    setActiveTool(null);
    nextSeqRef.current = 1;
    bufferRef.current.clear();
  }, []);

  return {
    isConnected,
    streamedText,
    activeTool,
    logs,
    contextSnapshot,
    sendMessage,
    resetStream
  };
}
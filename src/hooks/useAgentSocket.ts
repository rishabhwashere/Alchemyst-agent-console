import { useEffect, useRef, useState, useCallback } from 'react';
import { ServerMessage, ClientMessage } from '../types/protocol';

const SOCKET_URL = 'ws://localhost:4747/ws';

export function useAgentSocket() {
  const [isConnected, setIsConnected] = useState(false);
  
  // 1. Add state to hold the incoming text
  const [streamedText, setStreamedText] = useState(""); 
  
  const wsRef = useRef<WebSocket | null>(null);

  const sendMessage = useCallback((msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      console.warn("Attempted to send message, but socket is not open:", msg);
    }
  }, []);

  useEffect(() => {
    if (wsRef.current) return;

    const ws = new WebSocket(SOCKET_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Agent Server');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('Disconnected from Agent Server');
      setIsConnected(false);
      wsRef.current = null;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // 1. Handle Heartbeats
        if (message.type === 'PING') {
          // @ts-ignore
          sendMessage({ type: 'PONG', echo: message.challenge });
          return; 
        }

        // 2. NEW: Handle Tool Acknowledgements to stop backend timeouts
        // Assuming the backend sends 'TOOL_CALL' or similar when it wants an ACK
        if (message.call_id && !message.type.includes('ACK')) {
           // @ts-ignore - Instantly echo back an acknowledgement
           sendMessage({ type: 'TOOL_ACK', call_id: message.call_id });
        }

        // 3. FIX: Catch the 'TOKEN' type and extract the 'text' property!
        if (message.type === 'TOKEN') {
          setStreamedText(prev => prev + (message.text || ""));
        } 
        // Optional: Catch a 'STREAM_END' or 'TOOL_RESULT' if you want to display those too
        else if (message.type !== 'PING') {
          console.log("Received other message:", message.type, message);
        }

      } catch (error) {
        console.error("Failed to parse incoming message:", error);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sendMessage]);

  return {
    isConnected,
    sendMessage,
    streamedText,     // Export the text for the UI
    setStreamedText   // Export the setter so the UI can clear the screen
  };
}
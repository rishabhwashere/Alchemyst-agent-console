// src/app/page.tsx
'use client';

import { useState } from "react";
import { useAgentSocket } from "@/hooks/useAgentSocket";

// A highly performant, zero-dependency JSON tree viewer using native HTML5
const JsonViewer = ({ data }: { data: any }) => {
  if (typeof data !== 'object' || data === null) {
    return <span className="text-emerald-400">{JSON.stringify(data)}</span>;
  }
  
  return (
    <div className="pl-4 border-l border-zinc-700/50 my-1">
      {Object.entries(data).map(([key, value]) => (
        <details key={key} className="group" open={typeof value !== 'object'}>
          <summary className="cursor-pointer list-none select-none text-blue-300 hover:text-blue-200">
            <span className="text-zinc-500 mr-2 text-xs group-open:rotate-90 inline-block transition-transform">▶</span>
            <span className="font-semibold">{key}: </span>
            {typeof value !== 'object' && <span className="text-emerald-400">{JSON.stringify(value)}</span>}
            {typeof value === 'object' && value !== null && <span className="text-zinc-500 text-xs italic">{Array.isArray(value) ? `Array[${value.length}]` : '{...}'}</span>}
          </summary>
          {typeof value === 'object' && value !== null && (
            <div className="mt-1">
              <JsonViewer data={value} />
            </div>
          )}
        </details>
      ))}
    </div>
  );
};

export default function Home() {
  const { isConnected, streamedText, activeTool, logs, contextSnapshot, sendMessage, resetStream } = useAgentSocket();
  
  // NEW: State to manage the right panel tabs
  const [activeTab, setActiveTab] = useState<'timeline' | 'context'>('timeline');

  const handleStartStream = () => {
    sendMessage({ type: "USER_MESSAGE", content: "Begin analysis" });
  };

  return (
    <main className="flex h-screen bg-zinc-950 text-white overflow-hidden p-6 gap-6">
      
      {/* LEFT COLUMN: The User Interface */}
      <div className="flex-1 flex flex-col max-w-4xl h-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Agent Console</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-zinc-400">{isConnected ? "Connected" : "Offline"}</span>
            </div>
            <button onClick={resetStream} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md text-sm font-semibold transition-colors">
              Clear
            </button>
            <button onClick={handleStartStream} disabled={!isConnected} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 rounded-md text-sm font-semibold transition-colors">
              Trigger Stream
            </button>
          </div>
        </div>

        {/* Real-Time Text Terminal */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-xl overflow-y-auto">
          <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap mb-4 text-zinc-300">
            {streamedText || <span className="text-zinc-600 italic">Awaiting stream transmission...</span>}
          </div>

          {activeTool && (
            <div className="mt-6 border border-blue-500/30 bg-blue-900/10 rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                <span className="text-blue-400 font-semibold tracking-wide">Executing Tool: {activeTool.name}</span>
              </div>
              <div className="bg-black/40 p-3 rounded font-mono text-xs text-blue-200/70 overflow-x-auto">
                {JSON.stringify(activeTool.args, null, 2)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Tabbed Debugger Panel */}
      <div className="w-[450px] bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col h-full overflow-hidden shadow-xl">
        
        {/* TABS */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50">
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-3 text-xs font-bold tracking-wider uppercase transition-colors ${activeTab === 'timeline' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Timeline
          </button>
          <button 
            onClick={() => setActiveTab('context')}
            className={`flex-1 py-3 text-xs font-bold tracking-wider uppercase transition-colors ${activeTab === 'context' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Context Inspector
          </button>
        </div>
        
        {/* TAB CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 font-mono text-xs">
          
          {activeTab === 'timeline' && (
            <>
              {logs.map((log) => (
                <div key={log.id} className="p-3 rounded border border-zinc-800 bg-black/40">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold ${
                      log.type === 'TOKEN' ? 'text-zinc-500' : 
                      log.type === 'TOOL_CALL' ? 'text-blue-400' : 
                      log.type === 'TOOL_RESULT' ? 'text-green-400' : 
                      log.type === 'CONTEXT_SNAPSHOT' ? 'text-purple-400' : 'text-zinc-400'
                    }`}>[{log.type}]</span>
                    <span className="text-zinc-600">seq: {log.raw.seq}</span>
                  </div>
                  <div className="text-zinc-300">{log.summary}</div>
                </div>
              ))}
              {logs.length === 0 && <div className="text-zinc-600 text-center mt-10">No events recorded.</div>}
            </>
          )}

          {activeTab === 'context' && (
            <div className="bg-black/40 p-4 rounded border border-zinc-800 min-h-full">
              {contextSnapshot ? (
                <JsonViewer data={contextSnapshot} />
              ) : (
                <div className="text-zinc-600 text-center mt-10 italic">Waiting for initial snapshot...</div>
              )}
            </div>
          )}

        </div>
      </div>

    </main>
  );
}
'use client';

import { useAgentSocket } from "@/hooks/useAgentSocket";

export default function Home() {
  // Extract everything from the updated hook
  const { isConnected, sendMessage, streamedText, setStreamedText } = useAgentSocket(); 
  
  const handleTriggerStream = () => {
    if (isConnected) {
      // Clear the terminal screen before starting a new stream
      setStreamedText(""); 
      
      // Use your native WebSocket message sender (Update 'USER_MESSAGE' if your backend expects a different trigger)
      sendMessage({ type: "USER_MESSAGE", content: "Begin analysis" }); 
    }
  };
  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-950 text-white">
      <h1 className="text-3xl font-bold mb-4">Agent Console</h1>
      
      <div className="flex items-center gap-2 mb-8">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span>{isConnected ? "Connected to Engine" : "Disconnected"}</span>
      </div>

      <button 
        onClick={handleTriggerStream}
        disabled={!isConnected}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 rounded-md font-semibold transition-colors mb-12"
      >
        Trigger Mock Stream
      </button>

      {/* The Real-Time Text Terminal */}
      <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-lg p-6 min-h-[400px] shadow-xl text-zinc-300">
        <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {streamedText || <span className="text-zinc-600 italic">Awaiting stream transmission...</span>}
        </div>
      </div>
    </main>
  );
}
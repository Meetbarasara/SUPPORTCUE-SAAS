import React, { useState, useEffect } from "react";
import { MessageCircle, User, Bot, RefreshCw } from "lucide-react";
import { chatAPI } from "../api/api";

const LeftSidebar = ({ selectedChat, onChatSelect, currentUser, refreshTrigger }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 30000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const fetchChats = async () => {
    try {
      // Only show the full loading skeleton on the very first load (chats is empty)
      // Subsequent refreshes silently update the list in the background
      if (chats.length === 0) setLoading(true);
      const response = await chatAPI.getActiveChats();
      setChats(response.data.chats);
      setError("");
    } catch (error) {
      console.error("Failed to fetch chats:", error);
      setError("Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const chatDate = new Date(date);
    const diffInMinutes = Math.floor((now - chatDate) / (1000 * 60));
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return chatDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="w-80 glass-subtle p-4 flex flex-col gap-3">
        <div className="h-6 w-32 rounded-md bg-white/5 animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 glass-subtle p-6 text-center">
        <p className="pill-error inline-block px-3 py-1.5 rounded-full text-[12px]">{error}</p>
        <button onClick={fetchChats} className="btn-ghost mt-3 px-3 py-2 rounded-xl text-[13px]">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 glass-subtle flex flex-col rounded-none border-y-0 border-l-0">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[15px] font-semibold tracking-tight">Active Chats</h2>
          <button
            onClick={fetchChats}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-white/5"
            aria-label="Refresh chats"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[12px] text-slate-400">
          {chats.length} conversation{chats.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {chats.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No active chats</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {chats.map((chat) => {
              const active = selectedChat?._id === chat._id;
              const isAI = chat.mode === "ai";
              return (
                <button
                  key={chat._id}
                  onClick={() => onChatSelect(chat)}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-200 relative overflow-hidden ${
                    active
                      ? "glass-strong"
                      : "hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  {/* Mode rail */}
                  <span
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                    style={{ background: isAI ? "var(--mode-ai)" : "var(--mode-human)", boxShadow: `0 0 12px ${isAI ? "var(--mode-ai)" : "var(--mode-human)"}` }}
                    aria-hidden
                  />
                  <div className="pl-3 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isAI ? "avatar-ai" : "avatar-human"
                          }`}
                        >
                          {isAI ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        </div>
                        <h3 className="text-[13px] font-semibold text-slate-100 truncate">
                          {chat.customer?.name || "Unknown"}
                        </h3>
                      </div>
                      <p className="text-[12px] text-slate-400 truncate ml-8">
                        {chat.lastMessage || "No messages yet"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 ml-8">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                            isAI ? "badge-ai" : "badge-human"
                          }`}
                        >
                          {isAI ? "AI" : "HUMAN"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap pt-0.5">
                      {formatTime(chat.lastInteraction)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;

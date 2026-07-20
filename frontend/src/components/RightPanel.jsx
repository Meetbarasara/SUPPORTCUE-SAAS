import React from "react";
import { User, Mail, MessageCircle, CheckCircle, Bot, Shield } from "lucide-react";

const RightPanel = ({ selectedChat, currentUser, onCloseChat }) => {
  if (!selectedChat) {
    return (
      <div className="w-80 glass-subtle flex items-center justify-center text-center px-6 rounded-none border-y-0 border-r-0">
        <div>
          <User className="h-10 w-10 mx-auto mb-3 text-slate-600 opacity-50" />
          <p className="text-sm text-slate-500">Select a chat to view customer context</p>
        </div>
      </div>
    );
  }

  const formatDate = (date) => {
    const d = date ? new Date(date) : null;
    if (!d || Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const isAI = selectedChat.mode === "ai";

  return (
    <div className="w-80 glass-subtle flex flex-col rounded-none border-y-0 border-r-0">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-[15px] font-semibold tracking-tight">Context</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">{selectedChat.customer?.name || "Customer"}</p>
      </div>

      {/* Customer card */}
      <div className="p-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center avatar-customer">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate">{selectedChat.customer?.name || "Unknown"}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Customer</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-slate-400">
            <Mail className="h-3.5 w-3.5" />
            <span className="truncate">{selectedChat.customer?.email || "No email"}</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="px-4 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 px-1">Status</p>
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-slate-400">Mode</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isAI ? "badge-ai" : "badge-human"}`}>
              {isAI ? <Bot className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
              {isAI ? "AI" : "HUMAN"}
            </span>
          </div>
          {selectedChat.assignedAgent && (
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-slate-400">Agent</span>
              <span className="text-[12px] font-medium text-slate-200">
                {selectedChat.assignedAgent.name || "Unknown"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 px-1">Activity</p>
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-slate-400 flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" /> Messages
            </span>
            <span className="text-[13px] font-semibold">{selectedChat.messageCount || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-slate-400">Last activity</span>
            <span className="text-[11px] text-slate-300">{formatDate(selectedChat.lastInteraction)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 mt-auto">
        <button
          onClick={() => onCloseChat(selectedChat._id)}
          className="w-full pill-success rounded-xl px-4 py-2.5 text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition-all hover:brightness-110"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Finish Chat
        </button>
        <p className="text-[10px] text-slate-600 text-center mt-3 font-mono">{selectedChat._id}</p>
      </div>
    </div>
  );
};

export default RightPanel;

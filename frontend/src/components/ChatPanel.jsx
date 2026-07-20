import React, { useState, useEffect, useRef } from "react";
import { Send, User, Bot, Shield, MessageCircle, Sparkles } from "lucide-react";

const ChatPanel = ({ selectedChat, messages, onSendMessage, onTakeOver, currentUser, isTyping }) => {
  const [inputText, setInputText] = useState("");
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedChat) return;
    onSendMessage(inputText.trim());
    setInputText("");
    setIsTypingLocal(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = () => {
    if (!isTypingLocal) setIsTypingLocal(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTypingLocal(false), 1000);
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const getBubbleClass = (senderRole, senderId) => {
    if (senderRole === "ai") return "bubble-ai";
    if (senderRole === "customer") return "bubble-customer";
    if (senderId === currentUser?._id) return "bubble-self";
    return "bubble-human";
  };

  const getSenderIcon = (senderRole) => {
    if (senderRole === "ai") return <Bot className="h-3.5 w-3.5" />;
    if (senderRole === "customer") return <User className="h-3.5 w-3.5" />;
    return <Shield className="h-3.5 w-3.5" />;
  };

  const getAvatarClass = (senderRole, senderId) => {
    if (senderRole === "ai") return "avatar-ai";
    if (senderRole === "customer") return "avatar-customer";
    if (senderId === currentUser?._id) return "avatar-human";
    return "avatar-human";
  };

  const getSenderName = (senderRole, senderId) => {
    if (senderRole === "ai") return "AI Assistant";
    if (senderRole === "customer") return selectedChat?.customer?.name || "Customer";
    if (senderId === currentUser?._id) return "You";
    return "Agent";
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm px-8">
          <div
            className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--gradient-accent)" }}
          >
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2 tracking-tight">Select a conversation</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Pick a chat from the sidebar to read history, jump in, or take over from the AI.
          </p>
        </div>
      </div>
    );
  }

  const isAI = selectedChat.mode === "ai";

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Subtle mode tint at top edge */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${isAI ? "var(--mode-ai)" : "var(--mode-human)"}, transparent)`,
          opacity: 0.5,
        }}
        aria-hidden
      />

      {/* Chat header */}
      <div className="glass-subtle px-6 py-4 flex items-center justify-between rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center avatar-customer`}>
            <User className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight">
              {selectedChat.customer?.name || "Customer"}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  isAI ? "badge-ai" : "badge-human"
                }`}
              >
                {isAI ? <Bot className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                {isAI ? "AI MODE" : "HUMAN MODE"}
              </span>
              <span className="text-[11px] text-slate-500">{selectedChat.customer?.email}</span>
            </div>
          </div>
        </div>

        {isAI && (
          <button
            onClick={() => onTakeOver(selectedChat._id)}
            className="btn-accent rounded-full px-4 py-2 text-[13px] inline-flex items-center gap-2"
          >
            <Sparkles className="h-3.5 w-3.5" /> Take Over
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => {
          const isSelf = message.senderId === currentUser?._id;
          const isCustomer = message.senderRole === "customer";
          // Customer messages render on the left for agents; current agent's own messages on the right
          const alignRight = !isCustomer && isSelf;
          return (
            <div
              key={index}
              className={`flex items-end gap-2 animate-fade-slide ${alignRight ? "justify-end" : "justify-start"}`}
            >
              {!alignRight && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${getAvatarClass(message.senderRole, message.senderId)}`}>
                  {getSenderIcon(message.senderRole)}
                </div>
              )}
              <div className="max-w-md">
                <div className={`${getBubbleClass(message.senderRole, message.senderId)} px-3.5 py-2 rounded-2xl ${alignRight ? "rounded-br-md" : "rounded-bl-md"}`}>
                  <p className="text-[14px] leading-relaxed">{message.text}</p>
                </div>
                <div className={`mt-1 text-[10px] text-slate-500 flex items-center gap-1.5 ${alignRight ? "justify-end" : ""}`}>
                  <span className="font-medium">{getSenderName(message.senderRole, message.senderId)}</span>
                  <span>·</span>
                  <span>{formatTime(message.createdAt)}</span>
                </div>
              </div>
              {alignRight && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 avatar-human`}>
                  <Shield className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {(isTyping || isTypingLocal) && (
          <div className="flex items-end gap-2 animate-fade-slide">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isAI ? "avatar-ai" : "avatar-customer"}`}>
              {isAI ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
            </div>
            <div className={`${isAI ? "bubble-ai" : "bubble-customer"} px-3.5 py-2.5 rounded-2xl rounded-bl-md`}>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: "currentColor" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: "currentColor", animationDelay: "0.2s" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: "currentColor", animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="p-4 border-t border-white/10">
        <div className="glass rounded-2xl flex items-center gap-2 p-1.5">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            onInput={handleTyping}
            placeholder={isAI ? "AI is responding. Take over to send messages…" : "Write a reply…"}
            className="flex-1 bg-transparent px-3 py-2 text-[14px] text-slate-100 placeholder:text-slate-500 outline-none"
            disabled={isAI}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isAI}
            className="btn-accent rounded-xl w-10 h-10 flex items-center justify-center disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {isAI && (
          <p className="text-[11px] text-slate-500 mt-2 ml-1">
            This conversation is in AI mode. Click <span className="text-slate-300 font-medium">Take Over</span> to jump in.
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;

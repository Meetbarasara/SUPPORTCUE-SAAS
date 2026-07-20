import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { io } from "socket.io-client";
import { Send, X, MessageCircle, Bot, Shield, Sparkles } from "lucide-react";
import { chatAPI, customerAPI } from "../api/api";

// Socket URL: in production, set VITE_SOCKET_URL in your frontend .env
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const ChatWidget = ({ companyId, initialCustomerId, standalone }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [chatId, setChatId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [chatMode, setChatMode] = useState("ai");
  const [chatStatus, setChatStatus] = useState("open");
  const [assignedAgent, setAssignedAgent] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  // Prevent multiple simultaneous init calls
  const initializingRef = useRef(false);

  useEffect(() => {
    if (isOpen && !chatId && !initializingRef.current) {
      initializeChat();
    }
    
    // Notify parent iframe to resize
    if (standalone) {
      if (isOpen) {
        window.parent.postMessage({ source: 'supportcue-widget', type: 'resize', width: '380px', height: '540px' }, '*');
      } else {
        window.parent.postMessage({ source: 'supportcue-widget', type: 'resize', width: '64px', height: '64px' }, '*');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, standalone]);

  const scrollToBottom = () => {
    const anchor = messagesEndRef.current;
    if (!anchor) return;
    requestAnimationFrame(() => {
      anchor.scrollIntoView({ block: "end" });
      setTimeout(() => anchor.scrollIntoView({ block: "end" }), 30);
    });
  };

  useLayoutEffect(() => { scrollToBottom(); }, [messages]);

  const getUserId = () => {
    let id = initialCustomerId || localStorage.getItem("support_user_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("support_user_id", id);
    }
    return id;
  };

  const initializeChat = async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    try {
      const userId = getUserId();

      // Init customer session — backend returns widgetToken for socket auth
      const initResponse = await customerAPI.init({ userId, companyId });
      const { companyId: resolvedCompanyId, widgetToken } = initResponse.data;

      // ── Check for existing open chat before creating a new one ──
      let existingChatId = null;
      let initialMessages = [];
      let mode = "ai";
      let status = "open";
      let assignedAgentInfo = null;

      try {
        const existingChats = await chatAPI.getUserChats(userId, resolvedCompanyId);
        const openChat = existingChats.data.chats?.find(c => c.status === "open");
        if (openChat) {
          existingChatId = openChat._id;
          // Fetch messages for the existing chat
          const chatData = await chatAPI.getChat(openChat._id, userId);
          initialMessages = chatData.data.messages || [];
          mode = chatData.data.chat?.mode || "ai";
          status = chatData.data.chat?.status || "open";
          assignedAgentInfo = chatData.data.chat?.assignedAgentId || null;
        }
      } catch (e) {
        // No existing chats or fetch failed — we'll create a new one
      }

      // Create new chat only if no existing open chat found
      if (!existingChatId) {
        const response = await chatAPI.createChat({ userId, companyId: resolvedCompanyId });
        const { chat } = response.data;
        existingChatId = chat._id;
        initialMessages = chat.messages || [];
        mode = chat.mode;
        status = chat.status;
        assignedAgentInfo = chat.assignedAgentId;
      }

      setChatId(existingChatId);
      setChatMode(mode);
      setChatStatus(status);
      setAssignedAgent(assignedAgentInfo);

      if (initialMessages.length > 0) {
        setMessages(initialMessages);
      } else if (mode === "ai" && status === "open") {
        setMessages([{
          senderRole: "ai",
          text: "Hi! I'm your AI support assistant. Ask me anything — and just say \"talk to a human\" any time you'd like an agent.",
          createdAt: new Date(),
        }]);
      }

      // ── Connect socket with widget auth token ──
      const newSocket = io(SOCKET_URL, {
        transports: ["websocket"],
        reconnection: true,
        auth: {
          token: widgetToken,
          role: "customer"
        }
      });

      setSocket(newSocket);

      const joinChat = () => newSocket.emit("joinChat", { chatId: existingChatId, userId });

      newSocket.on("connect", joinChat);
      if (newSocket.connected) joinChat();

      newSocket.on("connect_error", (err) => {
        console.error("[Widget] Socket connection error:", err.message);
      });

      newSocket.on("chatHistory", ({ messages: history }) => {
        if (Array.isArray(history) && history.length > 0) {
          setMessages(history);
          scrollToBottom();
        }
      });

      newSocket.on("receiveMessage", ({ message }) => {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      });

      newSocket.on("chatTaken", ({ agentName, mode }) => {
        setChatMode(mode);
        setAssignedAgent(agentName);
      });

      newSocket.on("chatClosed", () => {
        setChatStatus("closed");
      });

      newSocket.on("userTyping", ({ userId: typingUserId, isTyping }) => {
        if (typingUserId !== getUserId()) setIsTyping(isTyping);
      });

      newSocket.on("aiTyping", ({ chatId: socketChatId, isTyping }) => {
        if (socketChatId === existingChatId || socketChatId === existingChatId?.toString()) {
          setIsTyping(isTyping);
        }
      });

      newSocket.on("error", ({ message }) => console.error("[Widget] Socket error:", message));

    } catch (error) {
      console.error("[Widget] Failed to initialize chat:", error);
    } finally {
      initializingRef.current = false;
    }
  };

  const sendMessage = () => {
    if (!inputText.trim() || !socket || !chatId || chatStatus === "closed") return;
    const userId = getUserId();
    socket.emit("sendMessage", { chatId, senderId: userId, senderRole: "customer", text: inputText.trim() });
    setInputText("");
    socket.emit("typing", { chatId, userId, isTyping: false });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = () => {
    if (socket && chatId) {
      socket.emit("typing", { chatId, userId: getUserId(), isTyping: true });
    }
  };

  const closeWidget = () => {
    setIsOpen(false);
    setIsTyping(false);
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isHuman = chatMode === "human";

  return (
    <div className={standalone ? "w-full h-full relative" : ""}>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`${standalone ? 'absolute bottom-0 right-0' : 'fixed bottom-6 right-6'} w-14 h-14 rounded-full z-50 flex items-center justify-center shadow-2xl btn-accent transition-transform hover:scale-105 active:scale-95`}
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {isOpen && (
        <div
          className={`glass-strong ${standalone ? 'w-full h-full' : 'fixed bottom-6 right-6 w-[380px] h-[540px]'} rounded-3xl z-50 flex flex-col overflow-hidden animate-scale-in`}
          style={{ transformOrigin: "bottom right" }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between border-b border-white/10"
            style={{
              background: isHuman
                ? "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(139,92,246,0.04))"
                : "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(34,211,238,0.04))",
            }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isHuman ? "avatar-human" : "avatar-ai"}`}>
                {isHuman ? <Shield className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div>
                <h3 className="font-semibold text-[14px] text-slate-100 tracking-tight">
                  {isHuman ? "Human Support" : "AI Support"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isHuman
                    ? `${assignedAgent?.name || assignedAgent || "Agent"} is here`
                    : "Online · usually replies instantly"}
                </p>
              </div>
            </div>
            <button onClick={closeWidget} className="text-slate-400 hover:text-slate-100 transition-colors p-1.5 rounded-lg hover:bg-white/10" aria-label="Close chat">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={messagesContainerRef}>
            {messages.map((message, index) => {
              const isCustomer = message.senderRole === "customer";
              const isAI = message.senderRole === "ai";
              const bubble = isCustomer ? "bubble-self" : isAI ? "bubble-ai" : "bubble-human";
              return (
                <div key={index} className={`flex items-end gap-2 animate-fade-slide ${isCustomer ? "justify-end" : "justify-start"}`}>
                  {!isCustomer && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isAI ? "avatar-ai" : "avatar-human"}`}>
                      {isAI ? <Bot className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    </div>
                  )}
                  <div className={`max-w-[260px] px-3 py-2 rounded-2xl ${bubble} ${isCustomer ? "rounded-br-md" : "rounded-bl-md"}`}>
                    <p className="text-[13px] leading-relaxed">{message.text}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">{formatTime(message.createdAt)}</p>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-end gap-2 animate-fade-slide">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isHuman ? "avatar-human" : "avatar-ai"}`}>
                  {isHuman ? <Shield className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                </div>
                <div className={`${isHuman ? "bubble-human" : "bubble-ai"} px-3 py-2.5 rounded-2xl rounded-bl-md`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] opacity-80 mr-1">{isHuman ? "Typing" : "AI is thinking"}</span>
                    <span className="w-1 h-1 rounded-full animate-pulse-soft" style={{ background: "currentColor" }} />
                    <span className="w-1 h-1 rounded-full animate-pulse-soft" style={{ background: "currentColor", animationDelay: "0.2s" }} />
                    <span className="w-1 h-1 rounded-full animate-pulse-soft" style={{ background: "currentColor", animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} style={{ height: "1px" }} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10">
            <div className="glass rounded-2xl flex items-center gap-1.5 p-1.5">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                onInput={handleTyping}
                disabled={chatStatus === "closed"}
                placeholder={chatStatus === "closed" ? "This chat has been closed." : "Type a message…"}
                className="flex-1 bg-transparent px-3 py-1.5 text-[13px] text-slate-100 placeholder:text-slate-500 outline-none disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim() || chatStatus === "closed"}
                className="btn-accent rounded-xl w-9 h-9 flex items-center justify-center disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-2 inline-flex items-center gap-1 w-full justify-center">
              <Sparkles className="h-2.5 w-2.5" /> Try saying "talk to a human"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;

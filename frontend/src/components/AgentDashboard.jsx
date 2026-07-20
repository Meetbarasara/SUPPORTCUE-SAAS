import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { chatAPI } from "../api/api";
import api from "../api/api";
import LeftSidebar from "./LeftSidebar";
import ChatPanel from "./ChatPanel";
import RightPanel from "./RightPanel";
import { Bell, AlertTriangle, LogOut, ShieldCheck, X } from "lucide-react";

// Socket URL from env — set VITE_SOCKET_URL in frontend/.env for production
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const AgentDashboard = ({ user, onLogout }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [joinedAgents, setJoinedAgents] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Debounce timer ref for sidebar refresh
  const refreshDebounceRef = useRef(null);
  // Ref to access latest selectedChat inside socket callbacks without re-registering
  const selectedChatRef = useRef(selectedChat);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  // ── Fetch persisted notifications on mount ──
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications?unreadOnly=true');
        const fetched = res.data.notifications.map(n => ({
          id: n._id,
          type: 'escalation',
          message: n.payload?.message || `Escalation for chat ${n.chatId?._id || n.chatId}`,
          chatId: n.chatId?._id || n.chatId,
          timestamp: new Date(n.createdAt),
          persisted: true
        }));
        setNotifications(fetched);
      } catch (err) {
        console.error('[AgentDashboard] Failed to fetch notifications:', err.message);
      }
    };
    fetchNotifications();
  }, []);

  // ── Debounced sidebar refresh ──
  const triggerRefresh = useCallback(() => {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    refreshDebounceRef.current = setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 500); // Collapse rapid chatUpdated events into one refresh
  }, []);

  // ── Initialize socket connection ──
  useEffect(() => {
    const token = localStorage.getItem('token');
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      auth: {
        token,
        role: user.role // 'agent' or 'superuser'
      }
    });
    setSocket(newSocket);

    const joinAgents = () => {
      newSocket.emit("joinAgents", { userId: user._id });
    };

    newSocket.on("connect", joinAgents);
    if (newSocket.connected) joinAgents();

    newSocket.on("connect_error", (err) => {
      console.error("[AgentDashboard] Socket auth error:", err.message);
    });

    newSocket.on("joinedAgents", () => {
      setJoinedAgents(true);
    });

    newSocket.on("error", (error) => {
      console.error("[AgentDashboard] Socket error:", error);
    });

    // Named handler for escalation — so we can clean it up precisely
    const handleEscalation = (data) => {
      const notification = {
        id: data.notificationId || Date.now(),
        type: "escalation",
        message: data.message || `Customer requested a human in chat ${data.chatId}`,
        chatId: data.chatId,
        timestamp: new Date(),
        persisted: true
      };
      setNotifications((prev) => {
        // Avoid duplicates (if already fetched from DB on mount)
        const exists = prev.some(n => n.id === notification.id);
        return exists ? prev : [notification, ...prev];
      });
    };

    const handleChatUpdated = () => triggerRefresh();

    newSocket.on("escalationRequest", handleEscalation);
    newSocket.on("chatUpdated", handleChatUpdated);

    return () => {
      newSocket.off("escalationRequest", handleEscalation);
      newSocket.off("chatUpdated", handleChatUpdated);
      newSocket.off("connect", joinAgents);
      newSocket.disconnect();
    };
  }, [user._id, user.role, triggerRefresh]);

  // ── Join/leave selected chat room ──
  useEffect(() => {
    if (!socket) return;

    const joinRoom = () => {
      if (selectedChat?._id) {
        socket.emit("joinChat", { chatId: selectedChat._id, userId: user._id });
      }
    };
    joinRoom();
    socket.on("connect", joinRoom);

    return () => {
      if (selectedChat?._id) {
        socket.emit("leaveChat", { chatId: selectedChat._id, userId: user._id });
      }
      socket.off("connect", joinRoom);
    };
  }, [socket, selectedChat?._id, user._id]);

  // ── Listen for new messages and typing (named handlers for proper cleanup) ──
  useEffect(() => {
    if (!socket) return;

    const handleReceive = ({ message, chatId }) => {
      const current = selectedChatRef.current;
      if (current && chatId === current._id?.toString()) {
        setMessages((prev) => [...prev, message]);
        if (current.status !== "open") {
          setSelectedChat((prev) => ({ ...prev, status: "open" }));
        }
      }
    };

    const handleTyping = ({ userId, isTyping }) => {
      if (selectedChatRef.current && userId !== user._id) setIsTyping(isTyping);
    };

    socket.on("receiveMessage", handleReceive);
    socket.on("userTyping", handleTyping);

    return () => {
      socket.off("receiveMessage", handleReceive);
      socket.off("userTyping", handleTyping);
    };
  }, [socket, user._id]);

  const handleChatSelect = async (chat) => {
    setSelectedChat(chat);
    setMessages([]);
    try {
      const response = await chatAPI.getChat(chat._id);
      setMessages(response.data.messages);
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
    }
  };

  const openChatById = async (chatId) => {
    try {
      const response = await chatAPI.getChat(chatId);
      const { chat, messages: chatMessages } = response.data;
      const normalizedChat = {
        _id: chat._id,
        customer: chat.customerId,
        assignedAgent: chat.assignedAgentId,
        mode: chat.mode,
        status: chat.status,
        lastInteraction: chat.lastInteraction,
        createdAt: chat.createdAt,
      };
      setSelectedChat(normalizedChat);
      setMessages(chatMessages || []);
      setShowNotifications(false);
    } catch (error) {
      console.error("Failed to open chat from notification:", error);
    }
  };

  const handleSendMessage = async (text) => {
    if (!selectedChat || !socket) return;
    socket.emit("sendMessage", {
      chatId: selectedChat._id,
      senderId: user._id,
      senderRole: "agent",
      text,
    });
  };

  const handleTakeOver = async (chatId) => {
    try {
      await chatAPI.takeOverChat(chatId, user._id);
      setSelectedChat((prev) => ({ ...prev, mode: "human", assignedAgentId: user._id }));
      if (socket) socket.emit("takeOver", { chatId, agentId: user._id });
    } catch (error) {
      console.error("Failed to take over chat:", error);
    }
  };

  const handleCloseChat = async (chatId) => {
    try {
      await chatAPI.closeChat(chatId);
      if (selectedChat?._id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to close chat:", error);
    }
  };

  // ── Notification management (mark as read on click) ──
  const clearNotification = async (notification) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    // Persist read state if it came from the backend
    if (notification.persisted) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
      } catch (e) {
        console.error('[AgentDashboard] Failed to mark notification read:', e.message);
      }
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    try {
      await api.put('/notifications/read-all');
    } catch (e) {
      console.error('[AgentDashboard] Failed to mark all notifications read:', e.message);
    }
  };

  const handleNotificationClick = async (notification) => {
    await openChatById(notification.chatId);
    clearNotification(notification);
  };

  return (
    <div className="h-screen flex flex-col text-slate-100">
      {/* Frosted header */}
      <header className="glass sticky top-0 z-30 px-6 py-3 flex items-center justify-between rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-tight">SupportCue</h1>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                {user.role === "admin" ? "Administrator" : "Agent Workspace"}
              </p>
            </div>
          </div>
          <span className="pill-success px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse-soft" /> Online
          </span>
          {!joinedAgents && (
            <span className="pill-warning px-2.5 py-1 rounded-full text-[11px] font-semibold">
              Connecting…
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="btn-ghost relative p-2 rounded-xl"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-bold rounded-full flex items-center justify-center text-white"
                  style={{ background: "var(--gradient-accent)" }}
                >
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="glass-strong absolute right-0 mt-2 w-80 rounded-2xl z-50 animate-fade-slide overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  {notifications.length > 0 && (
                    <button onClick={clearAllNotifications} className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors">
                      Clear all
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">All clear</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-3 hover:bg-white/5 cursor-pointer transition-colors"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="badge-human rounded-lg p-1.5 flex-shrink-0">
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-slate-200">{notification.message}</p>
                              <p className="text-[11px] text-slate-500 mt-1">
                                {notification.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); clearNotification(notification); }}
                              className="text-slate-500 hover:text-slate-200 transition-colors"
                              aria-label="Dismiss"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pl-3 border-l border-white/10">
            <div className="text-right">
              <p className="text-[13px] font-medium">{user.name}</p>
              <p className="text-[11px] text-slate-400">{user.email}</p>
            </div>
            <button onClick={onLogout} className="btn-ghost rounded-xl px-3 py-2 text-[13px] inline-flex items-center gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Three-pane workspace */}
      <div className="flex-1 flex overflow-hidden gap-px bg-white/5">
        <LeftSidebar
          selectedChat={selectedChat}
          onChatSelect={handleChatSelect}
          currentUser={user}
          refreshTrigger={refreshTrigger}
        />
        <ChatPanel
          selectedChat={selectedChat}
          messages={messages}
          onSendMessage={handleSendMessage}
          onTakeOver={handleTakeOver}
          currentUser={user}
          isTyping={isTyping}
        />
        <RightPanel selectedChat={selectedChat} currentUser={user} onCloseChat={handleCloseChat} />
      </div>
    </div>
  );
};

export default AgentDashboard;

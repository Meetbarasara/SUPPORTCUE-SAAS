import React, { useState, useEffect, useRef } from "react";
import { chatAPI, kbAPI } from "../api/api";

// ─── Icon SVGs (inline for zero dependency) ─────────────────────────────────
const Icons = {
  Building: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M12 14h.01M8 14h.01M16 14h.01"/></svg>
  ),
  Upload: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
  ),
  File: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  ),
  Logout: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
  MessageSquare: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  Download: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  ),
  Code: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
  ),
};

const StatusBadge = ({ status }) => {
  const config = {
    ready:      { cls: "pill-success", icon: <Icons.Check />, label: "Ready" },
    processing: { cls: "pill-warning", icon: <Icons.Clock />, label: "Processing" },
    error:      { cls: "pill-error",   icon: <Icons.X />,     label: "Error" },
  };
  const cfg = config[status] || config.error;
  return (
    <span className={`${cfg.cls} inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const CompanyDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("kb");

  return (
    <div className="min-h-screen text-slate-100">
      {/* Sticky frosted header */}
      <header className="glass sticky top-0 z-30 rounded-none border-x-0 border-t-0">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
              <Icons.Building />
            </div>
            <div>
              <div className="font-bold text-[15px] tracking-tight flex items-center gap-2">
                {user?.name}
                <span
                  className="badge-human text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  title="Your Company ID. Share with agents so they can join."
                >
                  ID · {user?._id}
                </span>
              </div>
              <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--accent-1)" }}>
                Company Dashboard
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            <TabBtn active={activeTab === "kb"} onClick={() => setActiveTab("kb")}>
              <Icons.File /> Knowledge Base
            </TabBtn>
            <TabBtn active={activeTab === "chats"} onClick={() => setActiveTab("chats")}>
              <Icons.MessageSquare /> Chat History
            </TabBtn>
            <TabBtn active={activeTab === "integration"} onClick={() => setActiveTab("integration")}>
              <Icons.Code /> Integration
            </TabBtn>
          </nav>

          <button onClick={onLogout} className="btn-ghost rounded-xl px-3 py-2 text-[13px] inline-flex items-center gap-1.5">
            <Icons.Logout /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        {activeTab === "kb" ? <KnowledgeBaseTab /> : activeTab === "chats" ? <ChatHistoryTab /> : <IntegrationTab user={user} />}
      </main>
    </div>
  );
};

function TabBtn({ active, children, ...rest }) {
  return (
    <button
      {...rest}
      className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
        active ? "text-white bg-white/[0.06] border border-white/10" : "text-slate-400 hover:text-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

const KnowledgeBaseTab = () => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [polling, setPolling] = useState(false);
  const fileRef = useRef(null);

  const fetchDocs = async () => {
    try {
      const res = await kbAPI.listDocuments();
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === "processing");
    if (hasProcessing && !polling) {
      setPolling(true);
      const interval = setInterval(async () => {
        await fetchDocs();
        const stillProcessing = documents.some((d) => d.status === "processing");
        if (!stillProcessing) { clearInterval(interval); setPolling(false); }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [documents, polling]);

  const handleFile = async (file) => {
    if (!file || file.type !== "application/pdf") { alert("Please upload a PDF file."); return; }
    setUploading(true);
    setProgress(0);
    try {
      await kbAPI.upload(file, (e) => { if (e.total) setProgress(Math.round((e.loaded / e.total) * 100)); });
      await fetchDocs();
    } catch (err) {
      alert(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (docId, docName) => {
    if (!window.confirm(`Delete "${docName}" and all its indexed chunks?`)) return;
    try {
      await kbAPI.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete document");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await kbAPI.search(searchQuery);
      setSearchResults(res.data.results);
    } catch (err) {
      alert("Search failed. Make sure documents are indexed.");
    } finally {
      setSearching(false);
    }
  };

  const fmtSize = (b) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
  const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 animate-fade-slide">
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-5">Document Management</h2>

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`glass-card rounded-2xl p-12 text-center cursor-pointer mb-6 transition-all ${
            dragging ? "border-[var(--accent-2)] bg-[rgba(139,92,246,0.06)]" : ""
          } ${uploading ? "cursor-not-allowed opacity-80" : "hover:border-white/20"}`}
          style={dragging ? { borderColor: "var(--accent-2)", background: "rgba(139,92,246,0.08)" } : undefined}
        >
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          {uploading ? (
            <>
              <div className="text-[14px] font-semibold text-[color:var(--accent-2)] mb-3">Uploading… {progress}%</div>
              <div className="bg-white/10 rounded-full h-1.5 overflow-hidden max-w-[300px] mx-auto">
                <div
                  className="h-full transition-all"
                  style={{ width: `${progress}%`, background: "var(--gradient-accent)" }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-[color:var(--accent-2)]" style={{ background: "rgba(139,92,246,0.10)" }}>
                <Icons.Upload />
              </div>
              <div className="text-[15px] font-semibold text-slate-100 mb-1">Drop PDF here or click to browse</div>
              <div className="text-[12px] text-slate-500">PDF only · Max 10 MB</div>
            </>
          )}
        </div>

        {documents.length > 0 ? (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Uploaded Documents ({documents.length})
            </h4>
            <div className="flex flex-col gap-2.5">
              {documents.map((doc) => (
                <div key={doc._id} className="glass-card glass-card-hover px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[color:var(--accent-2)]" style={{ background: "rgba(99,102,241,0.10)" }}>
                      <Icons.File />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold truncate">{doc.originalName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {fmtSize(doc.fileSize)} · {doc.totalChunks > 0 ? `${doc.totalChunks} chunks` : "indexing…"} · {fmtDate(doc.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={doc.status} />
                    <button
                      onClick={() => handleDelete(doc._id, doc.originalName)}
                      className="pill-error rounded-lg w-8 h-8 flex items-center justify-center hover:brightness-110"
                      aria-label="Delete"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="glass-card p-10 text-center text-slate-400">No documents uploaded yet.</div>
        )}
      </div>

      <div>
        <div className="glass-card p-6 sticky top-24">
          <h4 className="text-[15px] font-bold mb-2">Test Knowledge Base</h4>
          <p className="text-[12px] text-slate-400 mb-4 leading-relaxed">
            Ask a question to see what context the AI will retrieve from your documents.
          </p>
          <form onSubmit={handleSearch} className="flex flex-col gap-3 mb-5">
            <input
              className="input-glass w-full text-[13px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. What is the refund policy?"
            />
            <button type="submit" disabled={searching} className="btn-accent w-full rounded-xl py-2.5 text-[13px]">
              {searching ? "Searching…" : "Test AI Retrieval"}
            </button>
          </form>

          {searchResults && (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Retrieved Chunks</div>
              {searchResults.length === 0 ? (
                <p className="text-[12px] text-slate-500 text-center py-3 rounded-lg bg-white/[0.03]">No relevant information found.</p>
              ) : (
                searchResults.map((r, i) => (
                  <div key={i} className="rounded-xl p-3 border" style={{ background: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.20)" }}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-[color:var(--accent-2)]">Result #{i + 1}</span>
                      {r.score && <span className="text-[10px] font-semibold text-slate-300">Score: {r.score.toFixed(3)}</span>}
                    </div>
                    <p className="text-[12px] text-slate-200 leading-relaxed m-0">
                      {r.text.slice(0, 300)}{r.text.length > 300 ? "…" : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatHistoryTab = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null); // Can be a chat or a group of chats
  
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [groupByCustomer, setGroupByCustomer] = useState(false);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await chatAPI.getCompanyChats();
        setChats(res.data.chats || []);
      } catch (err) {
        console.error("Failed to load chats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  const formatDate = (d) =>
    new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const filteredChats = chats.filter(chat => 
    !filterCustomerId || (chat.customer && chat.customer.toLowerCase().includes(filterCustomerId.toLowerCase()))
  );

  let groupedChats = {};
  if (groupByCustomer) {
    filteredChats.forEach(chat => {
      const id = chat.customer || "Unknown Customer";
      if (!groupedChats[id]) groupedChats[id] = [];
      groupedChats[id].push(chat);
    });
  }

  const exportJSON = () => {
    let dataToExport = filteredChats;
    if (groupByCustomer) {
      dataToExport = groupedChats;
    }
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chats_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderChatListButton = (chat, active) => (
    <button
      key={chat._id}
      onClick={() => setSelectedItem({ type: 'single', data: chat })}
      className={`w-full text-left p-4 rounded-xl transition-all border ${
        active ? "border-[rgba(139,92,246,0.35)] bg-[rgba(99,102,241,0.08)]" : "border-transparent hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-[14px] font-semibold text-slate-100 truncate pr-2">
          {chat.customer || "Anonymous Customer"}
        </span>
        <span className="text-[10px] text-slate-500 whitespace-nowrap">{formatDate(chat.createdAt || chat.lastInteraction)}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[12px] text-slate-400">
          {chat.assignedAgent?.name ? `Agent: ${chat.assignedAgent.name}` : "Unassigned (AI)"}
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${chat.status === "open" ? "pill-success" : "bg-white/5 text-slate-400 border border-white/10"}`}>
          {chat.status.toUpperCase()}
        </span>
      </div>
    </button>
  );

  return (
    <div className="flex flex-col gap-4 animate-fade-slide">
      
      {/* Action Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <input 
            type="text" 
            placeholder="Filter by Customer ID..." 
            value={filterCustomerId}
            onChange={(e) => setFilterCustomerId(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-slate-200 outline-none focus:border-[rgba(139,92,246,0.5)] w-64"
          />
          <label className="flex items-center gap-2 text-[13px] text-slate-300 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={groupByCustomer}
              onChange={(e) => setGroupByCustomer(e.target.checked)}
              className="rounded bg-black/20 border-white/20 text-[rgba(139,92,246,1)] focus:ring-[rgba(139,92,246,0.5)]"
            />
            Group by Customer ID
          </label>
        </div>
        <button 
          onClick={exportJSON}
          className="btn-accent rounded-xl px-4 py-2 text-[13px] inline-flex items-center gap-2 whitespace-nowrap"
        >
          <Icons.Download /> Export JSON
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6" style={{ height: "calc(100vh - 250px)" }}>
        {/* List Pane */}
        <div className="glass-card flex flex-col overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h3 className="text-[15px] font-bold">Chats ({filteredChats.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="text-center p-5 text-slate-500 text-sm">Loading chats…</div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center p-10 text-slate-500 text-sm">No chats found.</div>
            ) : groupByCustomer ? (
              <div className="flex flex-col gap-4">
                {Object.entries(groupedChats).map(([customerId, groupChats]) => {
                  const isActiveGroup = selectedItem?.type === 'group' && selectedItem?.id === customerId;
                  return (
                    <div key={customerId} className="flex flex-col gap-1">
                      <button 
                        onClick={() => setSelectedItem({ type: 'group', id: customerId, data: groupChats })}
                        className={`text-left px-3 py-2 text-[13px] font-bold text-slate-200 bg-white/5 rounded-lg hover:bg-white/10 transition-colors flex justify-between ${isActiveGroup ? 'ring-1 ring-[rgba(139,92,246,0.5)]' : ''}`}
                      >
                        <span className="truncate">{customerId}</span>
                        <span className="text-[11px] text-slate-400 bg-black/20 px-2 py-0.5 rounded-full">{groupChats.length}</span>
                      </button>
                      <div className="flex flex-col gap-1 pl-2 border-l-2 border-white/5 ml-2 mt-1">
                        {groupChats.map(chat => renderChatListButton(chat, selectedItem?.data?._id === chat._id))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredChats.map((chat) => renderChatListButton(chat, selectedItem?.data?._id === chat._id))}
              </div>
            )}
          </div>
        </div>

        {/* JSON Viewer Pane */}
        <div className="glass-card flex flex-col overflow-hidden">
          {selectedItem ? (
            <>
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/20">
                <div>
                  <h3 className="text-[15px] font-bold">Raw JSON View</h3>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedItem.type === 'group' 
                      ? `Showing all ${selectedItem.data.length} chats for customer: ${selectedItem.id}` 
                      : `Showing chat ID: ${selectedItem.data._id}`}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-[#0d1117] p-4">
                <pre className="text-[13px] font-mono text-[#c9d1d9] leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(selectedItem.data, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
              <Icons.File />
              <p className="text-sm">Select a chat or group to view raw JSON</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const IntegrationTab = ({ user }) => {
  const serverUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
  const frontendUrl = window.location.origin;
  
  const snippet = `<script>
  window.SupportCueConfig = {
    companyId: "${user?._id}",
    serverUrl: "${serverUrl}",
    // customerId: "user-123" // Optional: Pass your logged-in user's ID here
  };
</script>
<script src="${frontendUrl}/widget.js" async></script>`;

  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-slide">
      <h2 className="text-xl font-bold tracking-tight mb-5">Widget Integration</h2>
      
      <div className="glass-card p-8 max-w-3xl">
        <h3 className="text-[16px] font-bold mb-3">Embed SupportCue on your website</h3>
        <p className="text-[13px] text-slate-300 mb-6 leading-relaxed">
          Copy the code snippet below and paste it just before the closing <code>&lt;/body&gt;</code> tag on all pages where you want the chat widget to appear.
        </p>

        <div className="relative mb-6">
          <div className="absolute top-0 right-0 p-2">
            <button 
              onClick={copyToClipboard}
              className="bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white"
            >
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>
          <pre className="bg-[#0d1117] p-5 pt-12 rounded-2xl overflow-x-auto text-[13px] font-mono text-[#c9d1d9] border border-white/10 whitespace-pre-wrap">
            {snippet}
          </pre>
        </div>

        <div className="p-4 rounded-xl" style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)" }}>
          <h4 className="text-[13px] font-bold text-[color:var(--accent-1)] mb-2">How it works</h4>
          <ul className="text-[12px] text-slate-300 space-y-2 list-disc pl-4">
            <li>The widget will appear as a floating chat bubble in the bottom right corner of your site.</li>
            <li>Customers can interact with your AI assistant immediately using your company's knowledge base.</li>
            <li>If the AI cannot resolve the issue or if the customer requests it, the chat will be routed to your human agents.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;

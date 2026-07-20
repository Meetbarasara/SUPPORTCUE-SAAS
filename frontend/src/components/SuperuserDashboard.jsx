import React, { useState, useEffect } from "react";
import { companyAPI } from "../api/api";

const Icons = {
  Building: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M12 14h.01M8 14h.01M16 14h.01"/></svg>
  ),
  Trash: () => (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>),
  Edit: () => (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
  Plus: () => (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  X: () => (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  Logout: () => (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>),
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`glass-strong fixed bottom-6 right-6 z-[9999] rounded-2xl px-5 py-3 max-w-sm animate-fade-slide ${type === "error" ? "pill-error" : "pill-success"}`}>
      <p className="text-[13px] font-medium">{message}</p>
    </div>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
    <div className="glass-strong rounded-3xl p-8 w-full max-w-lg animate-scale-in" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[18px] font-bold tracking-tight">{title}</h3>
        <button onClick={onClose} className="btn-ghost rounded-lg p-1.5"><Icons.X /></button>
      </div>
      {children}
    </div>
  </div>
);

const CreateCompanyModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    try {
      const res = await companyAPI.create({ name: name.trim(), email: email.trim(), systemPrompt: prompt.trim() || undefined });
      onCreated(res.data.company);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create New Company" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-slate-400 mb-1.5">Company Name *</label>
          <input className="input-glass w-full text-[14px]" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Insurance Ltd" required />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-slate-400 mb-1.5">Company Email *</label>
          <input type="email" className="input-glass w-full text-[14px]" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@acme.com" required />
          <p className="text-[11px] text-slate-500 mt-1.5">An invitation link will be generated for this email.</p>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-slate-400 mb-1.5">AI System Prompt</label>
          <textarea
            className="input-glass w-full text-[14px] min-h-[100px] font-sans"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="You are a helpful support agent for Acme Insurance. Be concise and accurate."
          />
          <p className="text-[11px] text-slate-500 mt-1.5">Defines the AI's persona for this company's customers.</p>
        </div>
        <div className="flex gap-3 justify-end mt-2">
          <button type="button" className="btn-ghost rounded-xl px-4 py-2 text-[13px]" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={loading} className="btn-accent rounded-xl px-4 py-2 text-[13px] inline-flex items-center gap-1.5">
            {loading ? "Creating…" : (<><Icons.Plus /> Create Company</>)}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const EditCompanyModal = ({ company, onClose, onUpdated }) => {
  const [name, setName] = useState(company.name);
  const [prompt, setPrompt] = useState(company.systemPrompt || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await companyAPI.update(company._id, { name: name.trim(), systemPrompt: prompt.trim() });
      onUpdated(res.data.company);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Edit — ${company.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-slate-400 mb-1.5">Company Name</label>
          <input className="input-glass w-full text-[14px]" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-slate-400 mb-1.5">AI System Prompt</label>
          <textarea className="input-glass w-full text-[14px] min-h-[120px] font-sans" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end mt-2">
          <button type="button" className="btn-ghost rounded-xl px-4 py-2 text-[13px]" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={loading} className="btn-accent rounded-xl px-4 py-2 text-[13px]">
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const SuperuserDashboard = ({ user, onLogout }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [toast, setToast] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await companyAPI.list();
      setCompanies(res.data.companies || []);
    } catch {
      showToast("Failed to load companies", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleDelete = async (company) => {
    if (!confirm(`Delete company "${company.name}" and ALL its documents and data? This cannot be undone.`)) return;
    setDeletingId(company._id);
    try {
      await companyAPI.remove(company._id);
      setCompanies((prev) => prev.filter((c) => c._id !== company._id));
      showToast(`"${company.name}" deleted successfully`);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete company", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreated = (company) => {
    setCompanies((prev) => [company, ...prev]);
    showToast(`"${company.name}" created successfully`);
  };

  const handleUpdated = (company) => {
    setCompanies((prev) => prev.map((c) => (c._id === company._id ? { ...c, ...company } : c)));
    showToast("Company updated successfully");
  };

  const totalDocs = companies.reduce((s, c) => s + (c.stats?.documents || 0), 0);
  const totalChunks = companies.reduce((s, c) => s + (c.stats?.chunks || 0), 0);

  const stats = [
    { label: "Total Companies", value: companies.length, accent: "var(--accent-1)" },
    { label: "Total Documents", value: totalDocs, accent: "var(--accent-2)" },
    { label: "Total Indexed Chunks", value: totalChunks.toLocaleString(), accent: "var(--mode-ai)" },
  ];

  return (
    <div className="min-h-screen text-slate-100">
      <header className="glass sticky top-0 z-30 rounded-none border-x-0 border-t-0">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
              <Icons.Building />
            </div>
            <div>
              <div className="font-bold text-[15px] tracking-tight">SupportCue</div>
              <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--accent-1)" }}>
                Superuser Dashboard
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[13px] font-semibold">{user?.name}</div>
              <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--accent-1)" }}>Superuser</div>
            </div>
            <button onClick={onLogout} className="btn-ghost rounded-xl px-3 py-2 text-[13px] inline-flex items-center gap-1.5">
              <Icons.Logout /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="glass-card glass-card-hover p-6 animate-fade-slide">
              <div className="text-[12px] text-slate-400 font-semibold mb-2">{s.label}</div>
              <div className="text-[32px] font-extrabold tracking-tight" style={{ color: s.accent }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold tracking-tight">Companies</h2>
          <button onClick={() => setShowCreate(true)} className="btn-accent rounded-xl px-4 py-2 text-[13px] inline-flex items-center gap-1.5">
            <Icons.Plus /> New Company
          </button>
        </div>

        {loading ? (
          <div className="text-center p-16 text-slate-500">Loading companies…</div>
        ) : companies.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <div className="text-[color:var(--accent-1)] mb-3 opacity-60 inline-block"><Icons.Building /></div>
            <div className="text-slate-300 font-semibold mb-1">No companies yet</div>
            <div className="text-[13px] text-slate-500">Create your first company to get started</div>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
            {companies.map((company) => (
              <div key={company._id} className="glass-card glass-card-hover p-6 animate-fade-slide">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--gradient-accent)" }}>
                      <Icons.Building />
                    </div>
                    <div>
                      <div className="font-bold text-[15px] text-slate-100">{company.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">/{company.slug}</div>
                    </div>
                  </div>
                </div>

                <div className="glass-subtle rounded-xl p-3 mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">AI Prompt</div>
                  <div className="text-[12px] text-slate-300 leading-relaxed" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {company.systemPrompt || "Default prompt (not set)"}
                  </div>
                </div>

                <div className="flex gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-[20px] font-extrabold" style={{ color: "var(--accent-1)" }}>{company.stats?.documents || 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Documents</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[20px] font-extrabold" style={{ color: "var(--accent-2)" }}>{(company.stats?.chunks || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Chunks</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setEditingCompany(company)} className="btn-ghost flex-1 rounded-xl px-3 py-2 text-[12px] inline-flex items-center justify-center gap-1.5">
                    <Icons.Edit /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(company)}
                    disabled={deletingId === company._id}
                    className="pill-error rounded-xl px-3 py-2 text-[12px] inline-flex items-center justify-center hover:brightness-110 disabled:opacity-60"
                    aria-label="Delete"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && <CreateCompanyModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {editingCompany && <EditCompanyModal company={editingCompany} onClose={() => setEditingCompany(null)} onUpdated={handleUpdated} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default SuperuserDashboard;

import React from "react";
import { Link } from "react-router-dom";
import {
  MessageCircle, Users, Shield, Bot, ArrowRight, ShieldCheck,
  Zap, Sparkles, LogOut, ArrowUpRight,
} from "lucide-react";
import ChatWidget from "../components/ChatWidget";

const Home = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen text-slate-100">
      {/* Sticky frosted nav */}
      <nav className="glass sticky top-0 z-30 rounded-none border-x-0 border-t-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight">SupportCue</span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-[13px] text-slate-400">
            <a href="#features" className="hover:text-slate-100 transition-colors">Features</a>
            <a href="#how" className="hover:text-slate-100 transition-colors">How it works</a>
            <a href="#demo" className="hover:text-slate-100 transition-colors">Live demo</a>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden sm:inline text-[13px] text-slate-400">Hi, {user.name}</span>
                <Link to="/dashboard" className="btn-accent rounded-xl px-3.5 py-2 text-[13px] inline-flex items-center gap-1.5">
                  Dashboard <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <button onClick={onLogout} className="btn-ghost rounded-xl px-3 py-2 text-[13px] inline-flex items-center gap-1.5">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost rounded-xl px-3.5 py-2 text-[13px]">Sign in</Link>
                <a href="#demo" className="btn-accent rounded-xl px-3.5 py-2 text-[13px] inline-flex items-center gap-1.5">
                  Try the demo <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-32 -left-20 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, var(--mode-ai), transparent 70%)" }} />
          <div className="absolute top-20 -right-32 w-[600px] h-[600px] rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, var(--accent-2), transparent 70%)" }} />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center relative">
          <div className="animate-fade-slide">
            <div className="inline-flex items-center gap-1.5 glass-subtle rounded-full px-3 py-1.5 mb-6 text-[12px] text-slate-300">
              <Sparkles className="h-3 w-3" style={{ color: "var(--mode-ai)" }} />
              AI-first · human handoff in one tap
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] mb-5">
              Support that starts with{" "}
              <span style={{
                background: "linear-gradient(135deg, var(--mode-ai), var(--mode-human))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                AI
              </span>
              <br />and stays human.
            </h1>
            <p className="text-[17px] text-slate-400 leading-relaxed mb-8 max-w-xl">
              An AI agent answers every question instantly using your docs. The moment a
              customer says "talk to a human," your team steps in — same conversation, full context, zero handoff drag.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#demo" className="btn-accent rounded-2xl px-5 py-3 text-[14px] inline-flex items-center gap-2">
                Try it live <ArrowRight className="h-4 w-4" />
              </a>
              <Link to="/login" className="btn-ghost rounded-2xl px-5 py-3 text-[14px]">
                Sign in to your workspace
              </Link>
            </div>

            <div className="flex items-center gap-6 mt-10 text-[12px] text-slate-500">
              <Legend dot="var(--mode-ai)" label="AI agent" />
              <Legend dot="var(--mode-human)" label="Human agent" />
              <Legend dot="rgba(148,163,184,0.6)" label="Customer" />
            </div>
          </div>

          {/* Hero centerpiece: scripted chat preview */}
          <HeroChatPreview />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="max-w-2xl mb-12">
          <p className="text-[12px] uppercase tracking-wider font-bold mb-3" style={{ color: "var(--mode-ai)" }}>What you get</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Built for the moment between bot and human.</h2>
          <p className="text-[15px] text-slate-400 leading-relaxed">
            SupportCue is opinionated about one thing: the handoff. Everything below is in service of that moment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Feature mode="ai" icon={Bot} title="AI that knows your product"
            body="Drop in PDFs and policies. The AI grounds every answer in your real docs — no hallucinated returns policies, no made-up SLAs." />
          <Feature mode="human" icon={Shield} title="One-tap human handoff"
            body="When the AI can't help — or a customer just wants a person — your team gets pinged in real time with full conversation context." />
          <Feature mode="ai" icon={Zap} title="Live typing + presence"
            body="Cyan-tinted AI typing, violet-tinted human typing. Customers always know who they're talking to without needing a label." />
          <Feature mode="human" icon={Users} title="Agent workspace that breathes"
            body="Three-pane workspace with inbox, conversation, and customer context. Glass surfaces and gentle motion — no flashing or noise." />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-[12px] uppercase tracking-wider font-bold mb-3" style={{ color: "var(--mode-human)" }}>How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">From AI to human, in the same thread.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Step n="01" mode="ai" title="AI replies instantly">
            Grounded answers from your knowledge base, available the moment a customer opens the widget.
          </Step>
          <Step n="02" mode="human" title="Customer asks for a human">
            One tap or natural language ("talk to a human") pings every available agent in real time.
          </Step>
          <Step n="03" mode="human" title="Agent takes over seamlessly">
            Full context, same thread — the customer never has to repeat themselves.
          </Step>
        </div>
      </section>

      {/* Demo CTA */}
      <section id="demo" className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="glass-card p-10 sm:p-14">
          <div className="inline-flex items-center gap-1.5 mb-5 text-[12px] text-slate-300 glass-subtle rounded-full px-3 py-1.5">
            <MessageCircle className="h-3 w-3" style={{ color: "var(--mode-ai)" }} />
            Live demo
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">See the handoff happen.</h2>
          <p className="text-[15px] text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
            Open the chat widget in the bottom-right. Ask the AI anything, then say
            <span className="font-semibold text-slate-200"> "talk to a human"</span> to watch the moment switch from cyan to violet.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] glass-subtle">
            <span className="w-2 h-2 rounded-full animate-pulse-soft" style={{ background: "var(--mode-ai)" }} />
            Widget is live · bottom right
          </div>
        </div>
      </section>

      <SiteFooter />

      <ChatWidget companyId="6a4bad103f1b1249be0a067f" />
    </div>
  );
};

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-900/10">
      <div className="max-w-6xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight">SupportCue</span>
          </div>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            AI-first customer support with seamless human handoff. Built for teams that care about craft.
          </p>
        </div>

        <FooterCol title="Product" links={[
          { label: "Features", href: "#features" },
          { label: "How it works", href: "#how" },
          { label: "Live demo", href: "#demo" },
        ]} />

        <FooterCol title="Company" links={[
          { label: "About the project", to: "/about" },
          { label: "Contact", href: "mailto:hello@supportcue.app" },
        ]} />

        <FooterCol title="Resources" links={[
          { label: "Sign in", to: "/login" },
          { label: "Dashboard", to: "/dashboard" },
          { label: "Privacy", href: "#" },
          { label: "Terms", href: "#" },
        ]} />
      </div>
      <div className="border-t border-slate-900/10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-slate-500">
          <span>© {new Date().getFullYear()} SupportCue · All rights reserved</span>
          <span className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: "var(--mode-ai)" }} />
            All systems operational
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="text-[12px] font-semibold tracking-wider uppercase text-slate-500 mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            {l.to ? (
              <Link to={l.to} className="text-[13px] text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-1">
                {l.label} <ArrowUpRight className="h-3 w-3 opacity-60" />
              </Link>
            ) : (
              <a href={l.href} className="text-[13px] text-slate-600 hover:text-slate-900 transition-colors">
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Legend({ dot, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ background: dot, boxShadow: `0 0 8px ${dot}` }} />
      {label}
    </span>
  );
}

function Feature({ mode, icon: Icon, title, body }) {
  const accent = mode === "ai" ? "var(--mode-ai)" : "var(--mode-human)";
  return (
    <div className="glass-card glass-card-hover p-6">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${mode === "ai" ? "avatar-ai" : "avatar-human"}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-[16px] font-semibold tracking-tight mb-2">{title}</h3>
      <p className="text-[13.5px] text-slate-400 leading-relaxed">{body}</p>
      <div className="mt-4 h-px" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} aria-hidden />
    </div>
  );
}

function Step({ n, mode, title, children }) {
  return (
    <div className="glass-card p-6">
      <div className="text-[11px] font-bold tracking-wider mb-4" style={{ color: mode === "ai" ? "var(--mode-ai)" : "var(--mode-human)" }}>
        STEP {n}
      </div>
      <h4 className="text-[16px] font-semibold tracking-tight mb-2">{title}</h4>
      <p className="text-[13.5px] text-slate-400 leading-relaxed">{children}</p>
    </div>
  );
}

/* ---------- Scripted hero chat preview (the cyan → violet moment) ---------- */
function HeroChatPreview() {
  const [step, setStep] = React.useState(0);
  const script = [
    { role: "customer", text: "Can I change the shipping address on my order?" },
    { role: "ai", text: "Yes — if your order hasn't shipped, you can edit the address from your account page. Want me to walk you through it?" },
    { role: "customer", text: "I'd rather talk to a human." },
    { role: "ai", text: "Of course — connecting you to an agent now." },
    { role: "agent", text: "Hi! Riya here — taking over from the AI. I can update that for you right now." },
  ];

  React.useEffect(() => {
    if (step >= script.length) {
      const reset = setTimeout(() => setStep(0), 4500);
      return () => clearTimeout(reset);
    }
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 600 : 1500);
    return () => clearTimeout(t);
  }, [step]);

  const visible = script.slice(0, step);
  const isHumanMode = visible.some((m) => m.role === "agent");

  return (
    <div className="relative animate-fade-slide">
      <div
        className="absolute -inset-1 rounded-[28px] opacity-50 blur-2xl -z-10 transition-colors"
        style={{
          background: isHumanMode
            ? "linear-gradient(135deg, rgba(139,92,246,0.40), rgba(99,102,241,0.20))"
            : "linear-gradient(135deg, rgba(34,211,238,0.40), rgba(99,102,241,0.20))",
        }}
        aria-hidden
      />
      <div className="glass-strong rounded-[24px] p-5 max-w-md mx-auto" style={{ minHeight: 480 }}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isHumanMode ? "avatar-human" : "avatar-ai"}`}>
              {isHumanMode ? <Shield className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-[13px] font-semibold tracking-tight">
                {isHumanMode ? "Riya · Support" : "AI Support"}
              </p>
              <p className="text-[11px] text-slate-400 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: isHumanMode ? "var(--mode-human)" : "var(--mode-ai)" }} />
                {isHumanMode ? "Online · just took over" : "Online"}
              </p>
            </div>
          </div>
          <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${isHumanMode ? "badge-human" : "badge-ai"}`}>
            {isHumanMode ? "HUMAN" : "AI"}
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-3 min-h-[320px]">
          {visible.map((m, i) => {
            const isCustomer = m.role === "customer";
            const isAI = m.role === "ai";
            const bubble = isCustomer ? "bubble-self" : isAI ? "bubble-ai" : "bubble-human";
            return (
              <div key={i} className={`flex items-end gap-2 animate-fade-slide ${isCustomer ? "justify-end" : "justify-start"}`}>
                {!isCustomer && (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isAI ? "avatar-ai" : "avatar-human"}`}>
                    {isAI ? <Bot className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                  </div>
                )}
                <div className={`${bubble} max-w-[78%] px-3.5 py-2 rounded-2xl ${isCustomer ? "rounded-br-md" : "rounded-bl-md"}`}>
                  <p className="text-[13px] leading-relaxed">{m.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Home;

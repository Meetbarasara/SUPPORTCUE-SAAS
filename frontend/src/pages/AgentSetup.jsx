import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authAPI } from "../api/api";
import { Lock, User, Eye, EyeOff, ShieldCheck, CheckCircle2 } from "lucide-react";

/**
 * Redeems an agent invitation. The email and the company both come from the
 * invitation itself — this page only collects a name and a password, so there
 * is no field here that could point the new account at a different company.
 */
const AgentSetup = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [invite, setInvite] = useState(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("This link is missing its invitation code.");
      setVerifying(false);
      return;
    }

    authAPI
      .verifyAgentInvite(token)
      .then((res) => setInvite(res.data))
      .catch((err) =>
        setError(err.response?.data?.error || "This invitation is invalid, expired, or already used.")
      )
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters long"); return; }

    setLoading(true);
    setError("");
    try {
      const res = await authAPI.acceptAgentInvite(token, name.trim(), password);
      // Accepting signs you in, so there is no second step.
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setSuccess(true);
      setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Could not create your account. The invitation may have expired.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-slide">
        <div className="glass-strong rounded-3xl p-8">
          <div className="text-center mb-6">
            <div
              className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--gradient-accent)" }}
            >
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              {invite ? `Join ${invite.companyName}` : "Agent Setup"}
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">
              {invite ? invite.email : "Create your agent account."}
            </p>
          </div>

          {verifying ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-b-transparent" />
            </div>
          ) : success ? (
            <div className="pill-success rounded-2xl p-5 text-center inline-flex flex-col items-center gap-2 w-full">
              <CheckCircle2 className="h-6 w-6" />
              <p className="text-[14px] font-semibold">Account created</p>
              <p className="text-[12px] opacity-80">Taking you to your workspace…</p>
            </div>
          ) : !invite ? (
            <div className="pill-error rounded-xl px-4 py-4 text-center">
              <p className="text-[14px] font-medium text-white">{error}</p>
              <button
                onClick={() => navigate("/login")}
                className="btn-ghost rounded-xl px-3 py-2 text-[13px] mt-3"
              >
                Go to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="pill-error rounded-xl px-4 py-2.5 text-[13px]">{error}</div>}

              <div className="relative">
                <User className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  className="input-glass w-full pl-10 text-[14px]"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <PasswordField
                value={password}
                setValue={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                placeholder="Create a password (8+ characters)"
              />
              <PasswordField
                value={confirmPassword}
                setValue={setConfirmPassword}
                show={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                placeholder="Confirm password"
              />

              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full rounded-2xl py-3 text-[14px] flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent" />
                ) : (
                  "Create account"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

function PasswordField({ value, setValue, show, onToggle, placeholder }) {
  return (
    <div className="relative">
      <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type={show ? "text" : "password"}
        required
        autoComplete="new-password"
        className="input-glass w-full pl-10 pr-10 text-[14px]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default AgentSetup;

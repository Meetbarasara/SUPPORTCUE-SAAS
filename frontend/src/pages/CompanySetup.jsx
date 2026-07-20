import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authAPI } from "../api/api";
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2 } from "lucide-react";

const CompanySetup = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [tokenValid, setTokenValid] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing invitation token.");
      setVerifying(false);
      return;
    }

    const checkToken = async () => {
      try {
        await authAPI.verifyCompanyInvite(token);
        setTokenValid(true);
      } catch (err) {
        setError("This invitation link has expired or has already been used.");
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters long"); return; }

    setLoading(true);
    setError("");
    try {
      await authAPI.acceptCompanyInvite(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to set password. The token may be expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-slide">
        <div className="glass-strong rounded-3xl p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--gradient-accent)" }}>
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Company Setup</h1>
            <p className="text-sm text-slate-400 mt-1.5">Create a secure password to access your dashboard.</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 mb-7">
            <div className="w-8 h-1 rounded-full bg-white/15" />
            <div className="w-8 h-1 rounded-full" style={{ background: "var(--gradient-accent)" }} />
            <div className="w-8 h-1 rounded-full bg-white/15" />
          </div>

          {verifying ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-b-transparent" />
            </div>
          ) : success ? (
            <div className="pill-success rounded-2xl p-5 text-center inline-flex flex-col items-center gap-2 w-full">
              <CheckCircle2 className="h-6 w-6" />
              <p className="text-[14px] font-semibold">Password set successfully</p>
              <p className="text-[12px] opacity-80">Redirecting to sign-in…</p>
            </div>
          ) : !tokenValid ? (
             <div className="pill-error rounded-xl px-4 py-4 text-center">
               <p className="text-[14px] font-medium text-white">{error}</p>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="pill-error rounded-xl px-4 py-2.5 text-[13px]">{error}</div>}

              <PasswordField
                value={password}
                setValue={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                placeholder="New password"
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
                disabled={loading || !token}
                className="btn-accent w-full rounded-2xl py-3 text-[14px] flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent" />
                ) : (
                  "Set Password & Finish Setup"
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
        className="input-glass w-full pl-10 pr-10 text-[14px]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
        aria-label={show ? "Hide" : "Show"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default CompanySetup;

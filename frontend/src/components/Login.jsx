import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../api/api";
import { Eye, EyeOff, Mail, Lock, User, Building2, ShieldCheck } from "lucide-react";

const Login = ({ setUser }) => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "", companyId: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginRole, setLoginRole] = useState("agent");
  const [isLoginView, setIsLoginView] = useState(true);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let response, userData, tokenStr;

      if (!isLoginView) {
        response = await authAPI.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          companyId: formData.companyId,
          role: "agent",
        });
        tokenStr = response.data.token;
        userData = response.data.user;
      } else {
        if (loginRole === "company") {
          response = await authAPI.companyLogin(formData);
          tokenStr = response.data.token;
          userData = { ...response.data.company, role: "company" };
        } else {
          response = await authAPI.login(formData);
          tokenStr = response.data.token;
          userData = response.data.user;
          if (userData.role !== loginRole) {
            setError(`Please log in with an account that has ${loginRole} privileges.`);
            setLoading(false);
            return;
          }
        }
      }

      localStorage.setItem("token", tokenStr);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          (isLoginView ? "Login failed. Please try again." : "Registration failed. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: "agent", label: "Agent", icon: User },
    { id: "company", label: "Company", icon: Building2 },
    { id: "superuser", label: "Superuser", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-slide">
        {/* Brand */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-100">SupportCue</span>
        </Link>

        <div className="glass-strong rounded-3xl p-8">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              {isLoginView ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">
              {isLoginView ? "Sign in to your workspace" : "Join your team as an agent"}
            </p>
          </div>

          {isLoginView && (
            <div className="glass-subtle rounded-2xl p-1 grid grid-cols-3 gap-1 mb-6">
              {roles.map((r) => {
                const Icon = r.icon;
                const active = loginRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setLoginRole(r.id)}
                    className={`relative rounded-xl py-2 px-2 text-[12px] font-medium inline-flex flex-col items-center gap-1 transition-all ${
                      active ? "text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                    style={active ? { background: "var(--gradient-accent)" } : undefined}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {r.label}
                  </button>
                );
              })}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="pill-error rounded-xl px-4 py-2.5 text-[13px]">{error}</div>
            )}

            {!isLoginView && (
              <>
                <Field icon={User} name="name" placeholder="Full name" value={formData.name} onChange={handleChange} />
                <Field icon={Building2} name="companyId" placeholder="Company ID (from your admin)" value={formData.companyId} onChange={handleChange} />
              </>
            )}

            <Field icon={Mail} type="email" name="email" placeholder="Email address" value={formData.email} onChange={handleChange} autoComplete="email" />

            <div className="relative">
              <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                className="input-glass w-full pl-10 pr-10 text-[14px]"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full rounded-2xl py-3 text-[14px] flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent" />
              ) : isLoginView ? (
                "Sign in"
              ) : (
                "Create agent account"
              )}
            </button>

            <p className="text-center text-[13px] text-slate-400 pt-1">
              {isLoginView ? "Are you an agent without an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => { setIsLoginView(!isLoginView); setError(""); }}
                className="font-semibold text-slate-100 hover:text-white"
                style={{ color: "var(--accent-2)" }}
              >
                {isLoginView ? "Sign up" : "Sign in"}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

function Field({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input required className="input-glass w-full pl-10 text-[14px]" {...props} />
    </div>
  );
}

export default Login;

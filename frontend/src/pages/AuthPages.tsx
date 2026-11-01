import { ArrowLeft, ArrowRight, Building2, Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { errorMessage, request } from "../services/api";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await signIn(values.email, values.password);
      else await signUp(values.name, values.email, values.password, values.phone);
      navigate("/dashboard");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  const signup = mode === "register";
  return <section className="auth-page"><div className="auth-art"><Link className="brand-lockup text-white" to="/"><span className="brand-mark"><Building2 size={18} /></span><span>estatea<span className="brand-period">.</span></span></Link><div><p className="eyebrow">Good places. Good people.</p><h1>A little closer<br />to <em>home.</em></h1><p>Let the next good thing begin here.</p></div><span className="auth-art-caption">Space to grow into your next chapter.</span></div><div className="auth-form-side"><Link className="text-link auth-back" to="/"><ArrowLeft size={16} /> Back to Estatea</Link><div className="auth-form-wrap"><p className="eyebrow eyebrow-dark">{signup ? "A warm welcome" : "Welcome back"}</p><h2>{signup ? "Let's find your place." : "Good to see you again."}</h2><p className="auth-subtitle">{signup ? "Create an account to save your favourite places and manage your listings." : "Sign in to pick up right where you left off."}</p>
    <form className="stack-form" onSubmit={submit}>{signup && <label className="field-label">Your name<input required minLength={2} autoComplete="name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} placeholder="How should we call you?" /></label>}<label className="field-label">Email address<input required type="email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} placeholder="you@example.com" /></label>{signup && <label className="field-label">Phone number <span className="optional">(optional)</span><input type="tel" autoComplete="tel" value={values.phone} onChange={(e) => setValues({ ...values, phone: e.target.value })} placeholder="+91 98765 43210" /></label>}<label className="field-label">Password<input required minLength={signup ? 8 : 1} maxLength={128} type="password" autoComplete={signup ? "new-password" : "current-password"} value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} placeholder={signup ? "At least 8 characters" : "Your password"} /></label>
      {error && <p className="form-error">{error}</p>}{!signup && <Link className="forgot-link" to="/forgot-password">Forgot your password?</Link>}<button disabled={busy} className="button button-dark w-full justify-center">{busy ? "One moment…" : signup ? "Create your account" : "Sign in"}<ArrowRight size={16} /></button></form>
    <p className="auth-switch">{signup ? "Already have an account?" : "New to Estatea?"} <Link to={signup ? "/login" : "/register"}>{signup ? "Sign in" : "Create an account"}</Link></p>
    </div></div></section>;
}

export function PasswordPage({ mode }: { mode: "forgot" | "reset" }) {
  const [search] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = mode === "forgot"
        ? await request<{ message: string }>({ url: "/auth/forgot-password", method: "POST", data: { email } })
        : await request<{ message: string }>({ url: "/auth/reset-password", method: "POST", data: { token: search.get("token"), password } });
      setMessage(result.message);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return <div className="simple-auth"><Link className="brand-lockup" to="/"><span className="brand-mark"><Building2 size={18} /></span><span>estatea<span className="brand-period">.</span></span></Link><div className="simple-auth-card"><span className="simple-auth-icon"><Check /></span><p className="eyebrow eyebrow-dark">Account support</p><h1>{mode === "forgot" ? "A fresh start." : "A new key, if you will."}</h1><p className="text-muted">{mode === "forgot" ? "Share your email and we'll send a secure password reset link." : "Choose a new password for your Estatea account."}</p><form className="stack-form mt-7" onSubmit={submit}>{mode === "forgot" ? <label className="field-label">Email address<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label> : <label className="field-label">New password<input type="password" required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>}{error && <p className="form-error">{error}</p>}{message && <p className="form-success"><Check size={16} />{message}</p>}<button disabled={busy} className="button button-dark w-full justify-center">{busy ? "Sending…" : mode === "forgot" ? "Send reset link" : "Update password"}<ArrowRight size={16} /></button></form><Link className="text-link mt-6" to="/login"><ArrowLeft size={15} /> Back to sign in</Link></div></div>;
} 

import { Check, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { request, errorMessage } from "../services/api";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setName(user?.name || ""); setPhone(user?.phone || ""); }, [user]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request({ url: "/users/me", method: "PATCH", data: { name, phone } });
      await refreshUser();
      setMessage("Your details have been saved.");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return <div className="dashboard-page"><div className="dashboard-welcome"><div><p className="eyebrow eyebrow-dark">A little about you</p><h1>Your home<br /><em>base.</em></h1><p>Keep your details up to date so the right people can reach you.</p></div></div><section className="profile-card"><div className="profile-card-title"><span className="profile-avatar"><UserRound /></span><div><h2>Personal details</h2><p>Only shared when it helps bring people together.</p></div></div><form className="stack-form" onSubmit={submit}><label className="field-label">Full name<input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></label><label className="field-label">Email address<input disabled value={user?.email || ""} /><span className="field-hint">Email changes aren't available here yet.</span></label><label className="field-label">Phone number<input maxLength={30} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" /></label>{error && <p className="form-error">{error}</p>}{message && <p className="form-success"><Check size={16} />{message}</p>}<button className="button button-dark self-start" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></form></section></div>;
} 

import { ArrowRight, ArrowUpRight, Check, Mail, MapPin, Phone } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { errorMessage, request } from "../services/api";

export function About() {
  return <div className="static-page"><section className="static-hero"><p className="eyebrow eyebrow-dark">A little about us</p><h1>Home is more<br />than <em>four walls.</em></h1><p>It's where the small things become the big things. We made Estatea to help more people find a place that feels like theirs.</p></section><section className="about-story"><div className="about-story-image" /><div><p className="eyebrow eyebrow-dark">The Estatea idea</p><h2>More human.<br /><em>More at home.</em></h2><p>Finding a home should feel hopeful, not overwhelming. Estatea brings thoughtful listings and real people together, so your next move can feel a little more like a beginning.</p><p>Whether you're looking for a place to grow into or ready to share a space you've loved, we're here to make the journey feel clearer, warmer, and yours.</p><Link className="button button-dark mt-5" to="/properties">Explore homes <ArrowRight size={16} /></Link></div></section><section className="about-values"><div><span>01</span><h3>People first</h3><p>Good homes start with good conversations.</p></div><div><span>02</span><h3>Clarity always</h3><p>Useful details, honest listings, no guesswork.</p></div><div><span>03</span><h3>Room to belong</h3><p>Every life deserves a place to feel at home.</p></div></section><section className="about-bottom"><p className="eyebrow">It starts somewhere</p><h2>Maybe it starts<br /><em>with a search.</em></h2><Link className="button button-light" to="/properties">Find your place <ArrowUpRight size={16} /></Link></section></div>;
}

export function Contact() {
  const [values, setValues] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSent(false);
    try {
      await request({ url: "/contact", method: "POST", data: values });
      setSent(true);
      setValues({ name: "", email: "", subject: "", message: "" });
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return <div className="contact-page">  <section className="contact-intro"><p className="eyebrow eyebrow-dark">We'd love to hear from you</p><h1>Let's talk<br /><em>about home.</em></h1><p>A question, a thought, a story about your search—we're here for it.</p><div className="contact-details"><a href="mailto:hello@estatea.in"><span><Mail size={18} /></span><div><small>Email us</small><b>hello@estatea.in</b></div></a><a href="tel:+911800123456"><span><Phone size={18} /></span><div><small>Call us</small><b>+91 1800 123 456</b></div></a><div><span><MapPin size={18} /></span><div><small>Where we are</small><b>Finding homes across India</b></div></div></div></section><section className="contact-form-panel"><p className="eyebrow eyebrow-dark">Drop us a note</p><h2>What's on your mind?</h2><p>Send a note and we'll get back to you.</p><form className="stack-form mt-6" onSubmit={submit}><label className="field-label">Your name<input required minLength={2} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} /></label><label className="field-label">Your email<input required type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} /></label><label className="field-label">Subject<input value={values.subject} onChange={(e) => setValues({ ...values, subject: e.target.value })} /></label><label className="field-label">Your message<textarea required minLength={10} rows={5} value={values.message} onChange={(e) => setValues({ ...values, message: e.target.value })} /></label>{error && <p className="form-error">{error}</p>}{sent && <p className="form-success"><Check size={16} />Thanks for reaching out. Your message has been sent.</p>}<button disabled={busy} className="button button-dark w-full justify-center">{busy ? "Sending…" : "Send message"} <ArrowRight size={16} /></button></form></section></div>;
}

export function NotFound() {
  return <div className="not-found"><span className="not-found-number">404</span><p className="eyebrow eyebrow-dark">Looks like we missed a turn</p><h1>This isn't quite<br /><em>the right place.</em></h1><p>Let's get you back to somewhere that feels more like home.</p><Link className="button button-dark mt-6" to="/">Back to the beginning <ArrowRight size={16} /></Link></div>;
} 

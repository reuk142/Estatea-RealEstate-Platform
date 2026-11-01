import { useState } from "react";
import { ArrowUpRight, Building2, Menu, X } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navClass = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? "nav-link-active" : ""}`;

export function SiteLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  async function logout() {
    try {
      await signOut();
      navigate("/");
    } catch {
      navigate("/");
    }
  }
  return (
    <div className="min-h-screen">
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand-lockup" to="/" aria-label="Estatea home"><span className="brand-mark"><Building2 size={18} /></span><span>estatea<span className="brand-period">.</span></span></Link>
          <button className="mobile-menu-button" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"}>{open ? <X /> : <Menu />}</button>
          <nav className={`main-nav ${open ? "main-nav-open" : ""}`}>
            <NavLink className={navClass} to="/properties" onClick={() => setOpen(false)}>Explore homes</NavLink>
            <NavLink className={navClass} to="/about" onClick={() => setOpen(false)}>About</NavLink>
            <NavLink className={navClass} to="/contact" onClick={() => setOpen(false)}>Contact</NavLink>
            {user ? <>
              <NavLink className={navClass} to="/dashboard" onClick={() => setOpen(false)}>Dashboard</NavLink>
              <button className="nav-link" onClick={() => void logout()}>Sign out</button>
            </> : <Link className="nav-login" to="/login" onClick={() => setOpen(false)}>Log in</Link>}
            <Link className="button button-dark nav-cta" to={user ? "/properties/new" : "/register"} onClick={() => setOpen(false)}>{user ? "List a property" : "Get started"}<ArrowUpRight size={15} /></Link>
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand"><Link className="brand-lockup text-white" to="/"><span className="brand-mark"><Building2 size={18} /></span><span>estatea<span className="brand-period">.</span></span></Link><p>Better spaces. Brighter beginnings.<br />Find a place that feels like yours.</p></div>
          <div className="footer-links"><p className="footer-label">DISCOVER</p><Link to="/properties">Homes for sale</Link><Link to="/properties?listingType=rent">Homes for rent</Link><Link to="/about">Our story</Link></div>
          <div className="footer-links"><p className="footer-label">SAY HELLO</p><Link to="/contact">Contact us</Link><a href="mailto:hello@estatea.in">hello@estatea.in</a><p className="text-sm text-white/55">Proudly finding homes across India</p></div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Estatea. Made for the way you live.</span><span>Thoughtful homes, thoughtfully found.</span></div>
      </footer>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading your account…</div>;
  if (!user) return <div className="page-loading"><p>Sign in to continue.</p><Link className="button button-dark mt-5" to="/login">Go to sign in</Link></div>;
  return children;
} 

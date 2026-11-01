import { ArrowRight, ArrowUpRight, CalendarCheck, CalendarDays, Home, Plus, UserRound, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { request, errorMessage } from "../services/api";
import { ErrorState, LoadingState } from "../components/States";

interface DashboardStats { properties: number; appointments: number; incomingRequests: number; upcomingViewings: number }
const tiles = [
  { key: "properties", label: "Your listings", icon: Home, link: "/my-properties" },
  { key: "appointments", label: "Your viewings", icon: CalendarDays, link: "/my-appointments" },
  { key: "incomingRequests", label: "Requests to answer", icon: CalendarCheck, link: "/incoming-requests" },
  { key: "upcomingViewings", label: "Upcoming viewings", icon: WalletCards, link: "/my-appointments" },
] as const;

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    request<{ stats: DashboardStats }>({ url: "/dashboard" }).then((result) => setStats(result.stats))
      .catch((reason: unknown) => setError(errorMessage(reason))).finally(() => setLoading(false));
  }, []);
  return <div className="dashboard-page"><div className="dashboard-welcome"><div><p className="eyebrow eyebrow-dark">Your Estatea space</p><h1>Good to have you,<br /><em>{user?.name.split(" ")[0]}.</em></h1><p>All the moving pieces, in one thoughtful place.</p></div><Link className="button button-dark" to="/properties/new"><Plus size={17} /> List a property</Link></div>
    {loading ? <LoadingState label="Gathering your dashboard…" /> : error ? <ErrorState message={error} /> : stats && <div className="stats-grid">{tiles.map(({ key, label, icon: Icon, link }) => <Link className="stat-card" key={key} to={link}><span className="stat-icon"><Icon size={20} /></span><span className="stat-number">{stats[key].toLocaleString("en-IN")}</span><span className="stat-label">{label}</span><ArrowUpRight className="stat-arrow" size={16} /></Link>)}</div>}
    <div className="dashboard-columns"><section className="dashboard-panel"><p className="eyebrow eyebrow-dark">A good place to start</p><h2>Make room for<br /><em>what's next.</em></h2><p>Keep your listings up to date, find the right viewing time, and make the next move at your own pace.</p><Link className="text-link" to="/my-properties">Manage your homes <ArrowRight size={16} /></Link></section><section className="dashboard-quick-links"><h2>Quick links</h2><Link to="/my-properties"><span className="quick-icon"><Home /></span><span><b>My properties</b><small>Manage your active listings</small></span><ArrowRight size={17} /></Link><Link to="/my-appointments"><span className="quick-icon"><CalendarDays /></span><span><b>Viewing appointments</b><small>See your upcoming visits</small></span><ArrowRight size={17} /></Link><Link to="/incoming-requests"><span className="quick-icon"><CalendarCheck /></span><span><b>Incoming requests</b><small>Respond to prospective buyers</small></span><ArrowRight size={17} /></Link><Link to="/profile"><span className="quick-icon"><UserRound /></span><span><b>Profile settings</b><small>Update your contact details</small></span><ArrowRight size={17} /></Link></section></div>
  </div>;
} 

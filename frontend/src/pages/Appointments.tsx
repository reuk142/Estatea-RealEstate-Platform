import { CalendarDays, Check, Clock3, MapPin, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { request, errorMessage } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type { Booking, Property, User } from "../types";

function getProperty(booking: Booking): Property | null {
  return typeof booking.property === "object" ? booking.property : null;
}
function getName(value: Booking["user"] | Booking["owner"]): string {
  return value && typeof value === "object" && "name" in value ? (value as User).name : "";
}
function AppointmentCard({ booking, incoming, guestToken, onChanged }: { booking: Booking; incoming: boolean; guestToken?: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const property = getProperty(booking);
  async function change(status: "confirmed" | "cancelled") {
    setBusy(true);
    setError("");
    try {
      if (guestToken) await request({ url: `/bookings/${booking._id}/cancel`, method: "POST", headers: { "X-Booking-Token": guestToken } });
      else if (incoming) await request({ url: `/bookings/${booking._id}`, method: "PATCH", data: { status } });
      else await request({ url: `/bookings/${booking._id}/cancel`, method: "POST" });
      onChanged();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return <article className="appointment-card"><div className="appointment-date"><span>{new Date(booking.startsAt).toLocaleDateString("en-IN", { month: "short" })}</span><b>{new Date(booking.startsAt).getDate()}</b><small>{new Date(booking.startsAt).toLocaleDateString("en-IN", { weekday: "short" })}</small></div><div className="appointment-body"><div className="appointment-heading"><div><p className="eyebrow eyebrow-dark">{incoming ? "Incoming viewing" : "Your viewing"}</p><h2>{property?.title || "Property viewing"}</h2></div><span className={`status-pill status-${booking.status}`}>{booking.status}</span></div><div className="appointment-meta"><span><Clock3 size={15} />{new Date(booking.startsAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>{property?.city && <span><MapPin size={15} />{property.city}</span>}<span>{incoming ? `Guest: ${booking.guestName || getName(booking.user) || "Guest"}` : "Viewing request"}</span></div>{booking.message && <p className="appointment-note">“{booking.message}”</p>}{error && <p className="form-error">{error}</p>}{booking.status !== "cancelled" && <div className="appointment-actions">{incoming && booking.status === "pending" && <button className="button button-outline" disabled={busy} onClick={() => void change("confirmed")}><Check size={15} />Confirm</button>}<button className="appointment-cancel" disabled={busy} onClick={() => void change("cancelled")}><X size={15} />Cancel appointment</button></div>}</div>{property && <Link className="appointment-open" to={`/properties/${property._id}`} aria-label="View property"><CalendarDays size={18} /></Link>}</article>;
}

export default function Appointments({ incoming = false }: { incoming?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guestBookings, setGuestBookings] = useState<Array<{ booking: Booking; token: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const location = useLocation();

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = user
        ? await request<{ bookings: Booking[] }>({ url: incoming ? "/bookings/incoming" : "/bookings/mine" })
        : { bookings: [] };
      setBookings(result.bookings);
      if (!incoming) {
        const keys = Object.keys(sessionStorage).filter((key) => key.startsWith("estatea-booking-"));
        const guests = await Promise.all(keys.map(async (key) => {
          const bookingId = key.slice("estatea-booking-".length);
          const token = sessionStorage.getItem(key) || "";
          try {
            const response = await request<{ booking: Booking }>({ url: `/bookings/${bookingId}`, headers: { "X-Booking-Token": token } });
            return { booking: response.booking, token };
          } catch {
            sessionStorage.removeItem(key);
            return null;
          }
        }));
        setGuestBookings(guests.filter((entry): entry is { booking: Booking; token: string } => entry !== null));
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!authLoading) void load();
  }, [incoming, location.key, authLoading, user]);

  return <div className="dashboard-page"><div className="dashboard-welcome"><div><p className="eyebrow eyebrow-dark">{incoming ? "People are interested" : "On the calendar"}</p><h1>{incoming ? <>A good place<br /><em>to meet.</em></> : <>Make time for<br /><em>what's next.</em></>}</h1><p>{incoming ? "Meet the people who could call your property home." : "A little time spent imagining what could be."}</p></div></div>
    {loading ? <LoadingState label="Checking your calendar…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : bookings.length || guestBookings.length ? <div className="appointments-list">{bookings.map((booking) => <AppointmentCard key={booking._id} booking={booking} incoming={incoming} onChanged={() => void load()} />)}{guestBookings.map(({ booking, token }) => <AppointmentCard key={booking._id} booking={booking} incoming={false} guestToken={token} onChanged={() => void load()} />)}</div> : <EmptyState title={incoming ? "No requests waiting" : "Nothing on the calendar yet"} body={incoming ? "When someone requests a viewing for your home, you'll find it here." : "Once you request a viewing, the details will be right here."} action={!incoming && <Link className="button button-dark mt-5" to="/properties">Explore homes</Link>} />}
  </div>;
} 

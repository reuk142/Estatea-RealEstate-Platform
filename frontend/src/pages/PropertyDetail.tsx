import { ArrowLeft, Bath, BedDouble, CalendarDays, Check, ChevronLeft, ChevronRight, MapPin, MoveUpRight, Ruler, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { formatPrice } from "../components/PropertyCard";
import { ErrorState, LoadingState } from "../components/States";
import { useAuth } from "../contexts/AuthContext";
import { request, errorMessage } from "../services/api";
import type { Booking, Property, User } from "../types";

const placeholder = "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85";

export default function PropertyDetail() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [form, setForm] = useState({ startsAt: "", guestName: "", guestEmail: "", guestPhone: "", message: "" });
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingBusy, setBookingBusy] = useState(false);

  async function load() {
    try {
      const result = await request<{ property: Property }>({ url: `/properties/${id}` });
      setProperty(result.property);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [id]);

  async function bookViewing(event: FormEvent) {
    event.preventDefault();
    setBookingBusy(true);
    setBookingError("");
    setBookingMessage("");
    try {
      const result = await request<{ booking: Booking; guestToken?: string }>({
        url: `/properties/${id}/bookings`,
        method: "POST",
        data: { ...form, startsAt: new Date(form.startsAt).toISOString() },
      });
      if (result.guestToken) sessionStorage.setItem(`estatea-booking-${result.booking._id}`, result.guestToken);
      setBookingMessage("Your viewing request is in. The owner will be in touch to confirm.");
      setForm({ startsAt: "", guestName: "", guestEmail: "", guestPhone: "", message: "" });
    } catch (reason) {
      setBookingError(errorMessage(reason));
    } finally {
      setBookingBusy(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !property) return <div className="section py-20"><ErrorState message={error || "Property not found."} /><Link className="text-link mt-5" to="/properties"><ArrowLeft size={16} /> Back to homes</Link></div>;
  const images = property.images.length ? property.images.map((image) => image.url) : [placeholder];
  const owner = typeof property.owner === "object" ? property.owner as User : null;
  const ownListing = owner?.id === user?.id || (property.owner && typeof property.owner === "object" && (property.owner as unknown as { _id?: string })._id === user?.id);
  const minimumDate = new Date(Date.now() + 60 * 60 * 1000);
  minimumDate.setMinutes(minimumDate.getMinutes() - minimumDate.getTimezoneOffset());
  const dateMin = minimumDate.toISOString().slice(0, 16);

  return (
    <div className="detail-page">
      <div className="detail-topline"><Link className="text-link" to="/properties"><ArrowLeft size={16} /> All homes</Link><span className="detail-breadcrumb">{property.city} / {property.propertyType}</span></div>
      <section className="detail-gallery">
        <div className="detail-main-image"><img src={images[activeImage]} alt={property.title} /><span className="detail-image-count">{activeImage + 1} / {images.length}</span><button className="gallery-arrow gallery-prev" aria-label="Previous image" onClick={() => setActiveImage((activeImage + images.length - 1) % images.length)}><ChevronLeft /></button><button className="gallery-arrow gallery-next" aria-label="Next image" onClick={() => setActiveImage((activeImage + 1) % images.length)}><ChevronRight /></button></div>
        <div className="detail-thumbnails">{images.slice(0, 4).map((src, index) => <button key={src} className={index === activeImage ? "thumbnail-active" : ""} onClick={() => setActiveImage(index)} aria-label={`View image ${index + 1}`}><img src={src} alt="" /></button>)}</div>
      </section>
      <div className="detail-content">
        <section className="detail-primary">
          <div className="detail-title-row"><div><p className="eyebrow eyebrow-dark">{property.propertyType} · For {property.listingType}</p><h1>{property.title}</h1><p className="detail-location"><MapPin size={16} />{property.address}, {property.city}</p></div><div className="detail-price">{formatPrice(property.price, property.listingType)}{property.listingType === "rent" && <small>monthly</small>}</div></div>
          <div className="detail-facts"><span><BedDouble />{property.bedrooms} bedrooms</span><span><Bath />{property.bathrooms} bathrooms</span><span><Ruler />{property.area.toLocaleString("en-IN")} sq ft</span></div>
          <div className="detail-description"><h2>A little about this place</h2><p>{property.description}</p></div>
          <div className="owner-card"><div className="owner-avatar">{owner?.name?.slice(0, 1).toUpperCase() || "E"}</div><div><span className="text-xs uppercase tracking-wider text-muted">Listed by</span><h3>{owner?.name || "Estatea homeowner"}</h3></div><ShieldCheck className="ml-auto text-brand" /></div>
        </section>
        <aside className="booking-card">
          <p className="eyebrow eyebrow-dark">Come see it in person</p><h2>Make yourself<br /><em>at home.</em></h2>
          {ownListing ? <div className="notice-box">This is your listing. <Link className="text-link" to={`/properties/${id}/edit`}>Edit property <MoveUpRight size={14} /></Link></div> : <>
            <form className="stack-form" onSubmit={bookViewing}>
              <label className="field-label">Preferred date &amp; time<input required type="datetime-local" min={dateMin} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
              {!user && <><label className="field-label">Your name<input required minLength={2} value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} placeholder="Full name" /></label><label className="field-label">Email address<input required type="email" value={form.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.target.value })} placeholder="you@example.com" /></label><label className="field-label">Phone number<input required minLength={6} value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} placeholder="+91 98765 43210" /></label></>}
              <label className="field-label">A note for the owner <span className="optional">(optional)</span><textarea rows={3} maxLength={1000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Anything you'd like them to know?" /></label>
              {bookingError && <p className="form-error">{bookingError}</p>}{bookingMessage && <div className="form-success"><Check size={16} /><span>{bookingMessage} <Link className="text-link" to="/my-appointments">View or manage it</Link></span></div>}
              <button className="button button-dark w-full justify-center" disabled={bookingBusy}>{bookingBusy ? "Sending request…" : "Request a viewing"}<CalendarDays size={16} /></button>
            </form><p className="booking-hint">No obligation, just a chance to see if it feels right.</p>
          </>}
        </aside>
      </div>
    </div>
  );
} 

import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, Building2, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PropertyCard } from "../components/PropertyCard";
import { ErrorState, LoadingState } from "../components/States";
import { request, errorMessage } from "../services/api";
import type { Property } from "../types";

const cities = ["Mumbai", "Pune", "Bengaluru", "Hyderabad", "Delhi", "Goa"];

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [location, setLocation] = useState("");
  const navigate = useNavigate();

  async function loadFeatured() {
    setLoading(true);
    setError("");
    try {
      const result = await request<{ items: Property[] }>({ url: "/properties", params: { limit: 3, sort: "newest" } });
      setProperties(result.items);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void loadFeatured(); }, []);

  function search(event: FormEvent) {
    event.preventDefault();
    navigate(`/properties${location.trim() ? `?city=${encodeURIComponent(location.trim())}` : ""}`);
  }

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> A better way to find home</div>
          <h1>Find a place<br />to <em>belong.</em></h1>
          <p>Beautiful homes, honest guidance, and a little more room for the life you want to live.</p>
          <form onSubmit={search} className="hero-search">
            <label htmlFor="hero-location"><MapPin size={19} /><input id="hero-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, neighbourhood, or postcode" /></label>
            <button type="submit" className="button button-dark"><Search size={16} /><span>Find a home</span></button>
          </form>
          <div className="hero-footnote"><ShieldCheck size={16} /><span>Thoughtfully listed. People-first service.</span></div>
        </div>
        <div className="hero-art" role="img" aria-label="Sunlit modern home with a garden">
          <div className="hero-art-image" />
          <div className="hero-art-shape" />
          <div className="hero-note"><span className="note-icon"><Sparkles size={16} /></span><span><b>Home, but better.</b><small>Find your next chapter</small></span></div>
          <div className="hero-image-caption"><span className="caption-line" /> A home for the good days</div>
        </div>
        <a className="hero-scroll" href="#featured"><ArrowDown size={15} /> Scroll to explore</a>
        <div className="hero-index">01 <span /> 04</div>
      </section>

      <section className="trust-strip">
        <div><BadgeCheck /><span>Listings you can trust</span></div><i />
        <div><Building2 /><span>Homes for every chapter</span></div><i />
        <div><ShieldCheck /><span>Here for you, start to keys</span></div>
      </section>

      <section className="section featured-section" id="featured">
        <div className="section-heading">
          <div><p className="eyebrow eyebrow-dark">A few good places</p><h2>Spaces worth<br /><em>coming home to.</em></h2></div>
          <Link className="text-link" to="/properties">Explore all homes <ArrowUpRight size={17} /></Link>
        </div>
        {loading ? <LoadingState label="Loading the latest listings…" /> : error ? <ErrorState message={error} onRetry={() => void loadFeatured()} /> : properties.length ? <div className="property-grid">{properties.map((property) => <PropertyCard key={property._id} property={property} />)}</div> : <div className="inline-empty"><p>Our first homes are on their way.</p><Link className="text-link" to="/properties/new">Be the first to list <ArrowRight size={16} /></Link></div>}
      </section>

      <section className="city-section">
        <div className="section city-inner">
          <div className="section-heading city-heading"><div><p className="eyebrow">Good places to begin</p><h2>Find your corner<br /><em>of India.</em></h2></div><p>From city mornings to slower weekends, your next home is closer than you think.</p></div>
          <div className="city-grid">{cities.map((city, index) => <button key={city} className={`city-tile city-tile-${index + 1}`} onClick={() => navigate(`/properties?city=${encodeURIComponent(city)}`)}><span>{city}</span><ArrowUpRight size={17} /></button>)}</div>
        </div>
      </section>

      <section className="section owner-cta">
        <div className="owner-cta-mark"><Building2 size={26} /></div><div><p className="eyebrow eyebrow-dark">For homeowners</p><h2>Your next chapter<br />could start <em>here.</em></h2></div>
        <p>List your home with people who care about the details as much as you do.</p>
        <Link className="button button-dark" to="/properties/new">List your property <ArrowUpRight size={16} /></Link>
      </section>
    </>
  );
} 

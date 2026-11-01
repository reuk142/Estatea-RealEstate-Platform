import { ArrowUpRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { formatPrice } from "../components/PropertyCard";
import { request, errorMessage } from "../services/api";
import type { Property } from "../types";

export default function MyProperties() {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    request<{ items: Property[] }>({ url: "/properties/mine" }).then((result) => setItems(result.items))
      .catch((reason: unknown) => setError(errorMessage(reason))).finally(() => setLoading(false));
  }, []);
  return <div className="dashboard-page"><div className="dashboard-welcome"><div><p className="eyebrow eyebrow-dark">Your homes</p><h1>A place for<br /><em>your places.</em></h1><p>Make every listing feel like an invitation.</p></div><Link className="button button-dark" to="/properties/new"><Plus size={17} /> Add a property</Link></div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : items.length ? <div className="my-property-grid">{items.map((property) => <article className="my-property-card" key={property._id}><Link to={`/properties/${property._id}`} className="my-property-image"><img src={property.images[0]?.url || "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80"} alt="" /><span>For {property.listingType}</span></Link><div className="my-property-info"><div><p className="text-sm text-muted">{property.city} · {property.propertyType}</p><h2>{property.title}</h2><p className="font-semibold text-brand">{formatPrice(property.price, property.listingType)}</p></div><div className="my-property-actions"><Link className="button button-outline" to={`/properties/${property._id}`}>View listing <ArrowUpRight size={15} /></Link><Link className="text-link" to={`/properties/${property._id}/edit`}>Edit</Link></div></div></article>)}</div> : <EmptyState title="A good place for your first listing" body="Share a few details about your home and let the right people find their way in." action={<Link className="button button-dark mt-5" to="/properties/new"><Plus size={16} /> Add your property</Link>} />}
  </div>;
} 

import { ArrowUpRight, Bath, BedDouble, MapPin, MoveUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Property } from "../types";

const fallbackImage = "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85";

export function formatPrice(price: number, listingType: Property["listingType"]): string {
  if (listingType === "rent") return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(price)} / mo`;
  if (price >= 10_000_000) return `₹${(price / 10_000_000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
  if (price >= 100_000) return `₹${(price / 100_000).toLocaleString("en-IN", { maximumFractionDigits: 0 })} L`;
  return `₹${new Intl.NumberFormat("en-IN").format(price)}`;
}

export function PropertyCard({ property }: { property: Property }) {
  return (
    <article className="property-card group">
      <Link to={`/properties/${property._id}`} className="relative block overflow-hidden rounded-2xl bg-slate-100">
        <img className="property-card-image" src={property.images[0]?.url || fallbackImage} alt={property.title} loading="lazy" />
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink">
          For {property.listingType}
        </span>
        <span className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-brand transition group-hover:rotate-45">
          <ArrowUpRight size={17} />
        </span>
      </Link>
      <div className="px-1 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{property.propertyType}</p>
            <h3 className="mt-1 font-display text-xl leading-snug text-ink">{property.title}</h3>
          </div>
          <p className="whitespace-nowrap pt-1 text-sm font-bold text-brand">{formatPrice(property.price, property.listingType)}</p>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><MapPin size={15} />{property.city}</p>
        <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs font-medium text-muted">
          <span className="flex items-center gap-1.5"><BedDouble size={15} />{property.bedrooms} beds</span>
          <span className="flex items-center gap-1.5"><Bath size={15} />{property.bathrooms} baths</span>
          <span className="ml-auto flex items-center gap-1.5">{property.area.toLocaleString("en-IN")} sq ft <MoveUpRight size={13} /></span>
        </div>
      </div>
    </article>
  );
} 

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { PropertyCard } from "../components/PropertyCard";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { request, errorMessage } from "../services/api";
import type { Property, PropertyFilters } from "../types";

interface ListingResponse { items: Property[]; page: number; pages: number; total: number }
const initialFilters = (params: URLSearchParams): PropertyFilters => ({
  city: params.get("city") || "",
  q: params.get("q") || "",
  minPrice: params.get("minPrice") || "",
  maxPrice: params.get("maxPrice") || "",
  propertyType: params.get("propertyType") || "",
  listingType: params.get("listingType") || "",
  minArea: params.get("minArea") || "",
  maxArea: params.get("maxArea") || "",
  bedrooms: params.get("bedrooms") || "",
  sort: params.get("sort") || "newest",
});

export default function Properties() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<PropertyFilters>(() => initialFilters(params));
  const [data, setData] = useState<ListingResponse>({ items: [], page: 1, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => {
    setFilters(initialFilters(params));
  }, [params]);

  async function load(query: URLSearchParams) {
    setLoading(true);
    setError("");
    try {
      const queryObject = Object.fromEntries(query.entries());
      const result = await request<ListingResponse>({ url: "/properties", params: queryObject });
      setData(result);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(params); }, [params]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) next.set(key, String(value)); });
    setParams(next);
    setMobileFilters(false);
  }
  function changePage(page: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function clearFilters() {
    setFilters({ sort: "newest" });
    setParams({});
  }
  const controls = (
    <form className="filter-form" onSubmit={applyFilters}>
      <div className="filter-mobile-heading"><h3>Filter homes</h3><button type="button" aria-label="Close filters" onClick={() => setMobileFilters(false)}><X /></button></div>
      <label className="field-label">Location<input value={filters.city || ""} onChange={(e) => setFilters({ ...filters, city: e.target.value })} placeholder="City or neighbourhood" /></label>
      <label className="field-label">Keyword<input value={filters.q || ""} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Pool, garden, bright…" /></label>
      <label className="field-label">Listing type<select value={filters.listingType || ""} onChange={(e) => setFilters({ ...filters, listingType: e.target.value })}><option value="">Buy or rent</option><option value="sale">For sale</option><option value="rent">For rent</option></select></label>
      <label className="field-label">Property type<select value={filters.propertyType || ""} onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}><option value="">Any property</option><option value="apartment">Apartment</option><option value="house">House</option><option value="villa">Villa</option><option value="plot">Plot</option><option value="commercial">Commercial</option></select></label>
      <div className="filter-two-col"><label className="field-label">Min price<input type="number" min="0" value={filters.minPrice || ""} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} placeholder="₹" /></label><label className="field-label">Max price<input type="number" min="0" value={filters.maxPrice || ""} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} placeholder="₹" /></label></div>
      <div className="filter-two-col"><label className="field-label">Min area<input type="number" min="0" value={filters.minArea || ""} onChange={(e) => setFilters({ ...filters, minArea: e.target.value })} placeholder="sq ft" /></label><label className="field-label">Max area<input type="number" min="0" value={filters.maxArea || ""} onChange={(e) => setFilters({ ...filters, maxArea: e.target.value })} placeholder="sq ft" /></label></div>
      <label className="field-label">Bedrooms<select value={filters.bedrooms || ""} onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}><option value="">Any</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+ bedrooms</option>)}</select></label>
      <div className="filter-actions"><button className="button button-dark" type="submit"><Search size={15} />Apply filters</button><button type="button" className="text-link" onClick={clearFilters}>Clear all</button></div>
    </form>
  );

  return (
    <div className="listings-page">
      <section className="listings-intro"><p className="eyebrow eyebrow-dark">Find your place</p><h1>Homes with a little<br /><em>more heart.</em></h1><p>Explore thoughtful spaces, listed by people who know them best.</p></section>
      <div className="listings-toolbar"><span>{data.total.toLocaleString("en-IN")} {data.total === 1 ? "home" : "homes"} to explore</span><div><button className="filter-toggle" onClick={() => setMobileFilters(true)}><SlidersHorizontal size={17} /> Filters</button><label className="sort-control">Sort by <select value={filters.sort || "newest"} onChange={(e) => { setFilters({ ...filters, sort: e.target.value }); const next = new URLSearchParams(params); next.set("sort", e.target.value); next.delete("page"); setParams(next); }}><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label></div></div>
      <div className="listing-layout"><aside className={`listing-filters ${mobileFilters ? "listing-filters-open" : ""}`}>{controls}</aside><section className="listing-results" aria-live="polite">
        {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={() => void load(params)} /> : data.items.length ? <>
          <div className="property-grid">{data.items.map((property) => <PropertyCard key={property._id} property={property} />)}</div>
          {data.pages > 1 && <div className="pagination"><button disabled={data.page <= 1} onClick={() => changePage(data.page - 1)}>Previous</button><span>Page {data.page} of {data.pages}</span><button disabled={data.page >= data.pages} onClick={() => changePage(data.page + 1)}>Next</button></div>}
        </> : <EmptyState title="No homes found just yet" body="Try widening your search or clearing a filter to see more places." action={<button className="button button-outline mt-4" onClick={clearFilters}>Clear filters</button>} />}
      </section></div>
    </div>
  );
} 

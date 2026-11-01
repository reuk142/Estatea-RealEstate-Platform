export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface PropertyImage {
  url: string;
  fileId: string;
}

export interface Property {
  _id: string;
  title: string;
  description: string;
  price: number;
  propertyType: "apartment" | "house" | "villa" | "plot" | "commercial";
  listingType: "sale" | "rent";
  city: string;
  address: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  images: PropertyImage[];
  owner: User | string;
  createdAt: string;
}

export interface Booking {
  _id: string;
  property: Property | string;
  owner: User | string;
  user?: User | string | null;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  startsAt: string;
  message: string;
  status: "pending" | "confirmed" | "cancelled";
}

export interface PropertyFilters {
  city?: string;
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  propertyType?: string;
  listingType?: string;
  minArea?: string;
  maxArea?: string;
  bedrooms?: string;
  sort?: string;
  page?: number;
  limit?: number;
} 

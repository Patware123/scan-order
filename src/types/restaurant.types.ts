import { UserRole } from "./database.types";

export interface RestaurantProfile {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  currency: string;
  gstNumber?: string | null;
  fssaiLicense?: string | null;
  createdAt: string;
}

export interface RestaurantBranding {
  restaurantId: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  primaryColor: string;
  tagline?: string | null;
  supportPhone?: string | null;
  supportEmail?: string | null;
}

export interface TableDetails {
  id: string;
  restaurantId: string;
  tableNumber: string;
  capacity: number;
  isActive: boolean;
  activeToken?: string;
}

export interface StaffMembership {
  userId: string;
  restaurantId: string;
  role: UserRole;
  restaurantName: string;
}

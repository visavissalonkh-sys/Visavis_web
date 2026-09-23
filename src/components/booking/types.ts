import type { ServiceCategory } from "@/lib/data/services";

export type WizardService = {
  id: string;
  category: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceFrom: number;
  priceTo: number | null;
  seoSlug: string;
};

export type WizardMaster = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  rating: number;
  isPopular: boolean;
};

export type WizardLocation = {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone: string;
};

export type WizardMasterLocation = { masterId: string; locationId: string; weekday: number };
export type WizardMasterSpecialty = { masterId: string; serviceId: string };

export type BookingWizardData = {
  categories: ServiceCategory[];
  services: WizardService[];
  masters: WizardMaster[];
  locations: WizardLocation[];
  masterLocations: WizardMasterLocation[];
  masterSpecialties: WizardMasterSpecialty[];
};

export type WizardStep = "service" | "master" | "datetime" | "confirm";

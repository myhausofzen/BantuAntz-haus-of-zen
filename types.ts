export interface PrescriptionState {
  isLoading: boolean;
  result: string | null;
  error: string | null;
}

export interface NavItem {
  label: string;
  href: string;
}

export enum PrescriptionType {
  CALM = 'Calm',
  ENERGY = 'Energy',
  CLARITY = 'Clarity',
  BALANCE = 'Balance'
}

export type Page = 'home' | 'manifesto' | 'journal' | 'contact' | 'shop' | 'product-detail' | 'appointments';

export type ProductCategory = 
  | 'All' 
  | 'Tinctures & Elixirs' 
  | 'Botanical Teas' 
  | 'Aromatics & Incense' 
  | 'Salves & Skincare' 
  | 'Ritual Objects';

export type ProductIntent = 
  | 'All'
  | 'Calm' 
  | 'Sleep' 
  | 'Clarity' 
  | 'Immunity' 
  | 'Balance' 
  | 'Radiance';

export interface Product {
  id: string;
  sku?: string;
  name: string;
  botanicalName?: string;
  subtitle: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: 'Tinctures & Elixirs' | 'Botanical Teas' | 'Aromatics & Incense' | 'Salves & Skincare' | 'Ritual Objects' | string;
  intent: 'Calm' | 'Sleep' | 'Clarity' | 'Immunity' | 'Balance' | 'Radiance';
  image: string;
  gallery?: string[];
  volume: string;
  sizeOptions?: string[];
  sizePrices?: Record<string, number>;
  sizeCompareAtPrices?: Record<string, number>;
  inStock: boolean;
  featured?: boolean;
  rating: number;
  reviewCount: number;
  ingredients: string[];
  ritualGuide: string;
  dosage: string;
  scentNotes?: string;
  certifications?: string[];
  tags?: string[];
  squareCatalogItemId?: string;
  squareVariationId?: string;
  squareUpdatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVolume?: string;
  selectedPrice?: number;
}

export interface BookingService {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  durationMinutes: number;
  price: number;
  depositAmount: number;
  category: 'Consultation' | 'Alchemy' | 'Somatic & Sound' | 'Virtual';
  availablePractitioners: string[];
  image: string;
  benefits: string[];
}

export interface Practitioner {
  id: string;
  name: string;
  title: string;
  bio: string;
  specialty: string;
  avatar: string;
}

export interface Appointment {
  id: string;
  serviceId: string;
  serviceTitle: string;
  practitionerId: string;
  practitionerName: string;
  date: string;
  timeSlot: string;
  durationMinutes: number;
  price: number;
  depositAmount: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  intentionNotes?: string;
  status: 'confirmed' | 'pending';
  paymentMethod: 'card' | 'fast_pay' | 'pay_in_person' | string;
  paymentLinkUrl?: string;
  squareOrderId?: string;
  paymentStatus?: 'paid' | 'deposit_paid' | 'due_at_arrival' | 'failed_ok';
  receiptUrl?: string;
  paymentError?: string;
  createdAt: string;
  bookingConfirmationId?: string;
}

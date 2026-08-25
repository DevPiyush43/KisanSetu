export type Role = 'farmer' | 'fpo_admin' | 'buyer' | 'admin'
export type LotStatus = 'draft' | 'listed' | 'offer_received' | 'negotiating' | 'sold' | 'expired'
export type OfferStatus = 'pending' | 'countered' | 'accepted' | 'rejected'
export type PaymentStatus = 'pending' | 'partially_paid' | 'paid'
export type GrievanceStatus = 'open' | 'resolved' | 'rejected'
export type PoolStatus = 'open' | 'listed' | 'closed'
export type LogisticsType = 'transporter' | 'cold_storage' | 'warehouse'
export type BuyerType = 'processor' | 'trader' | 'institutional'

export interface Profile {
  id: string
  role: Role
  full_name: string | null
  phone: string | null
  village: string | null
  district: string | null
  company_name: string | null
  buyer_type: BuyerType | null
  primary_crops: string[] | null
  operating_districts: string[] | null
  kyc_doc_url: string | null
  kyc_verified: boolean
  is_suspended: boolean
  language_pref: string
  trust_score: number
  created_at: string
}

export interface MandiPrice {
  id: number
  crop: string
  mandi: string
  district: string
  price_per_quintal: number
  recorded_on: string
}

export interface FpoPool {
  id: string
  fpo_admin_id: string
  crop: string
  name: string | null
  total_quantity: number
  status: PoolStatus
  created_at: string
  // joined
  fpo_admin?: Profile
  lots?: Lot[]
}

export interface Lot {
  id: string
  owner_id: string
  pool_id: string | null
  crop: string | null
  variety: string | null
  grade: string | null
  quantity: number | null
  unit: string
  expected_price: number | null
  location_district: string | null
  location_village: string | null
  photos: string[] | null
  pickup_notes: string | null
  status: LotStatus
  created_at: string
  // joined
  owner?: Profile
  pool?: FpoPool
  offers?: Offer[]
}

export interface Offer {
  id: string
  lot_id: string
  buyer_id: string
  price: number | null
  quantity: number | null
  pickup_date: string | null
  note: string | null
  status: OfferStatus
  counter_price: number | null
  created_at: string
  // joined
  lot?: Lot
  buyer?: Profile
}

export interface Contract {
  id: string
  offer_id: string
  lot_id: string
  farmer_id: string
  buyer_id: string
  final_price: number | null
  final_quantity: number | null
  terms: Record<string, unknown> | null
  created_at: string
  // joined
  offer?: Offer
  lot?: Lot
  farmer?: Profile
  buyer?: Profile
  payment?: Payment
}

export interface Payment {
  id: string
  contract_id: string
  status: PaymentStatus
  amount_paid: number
  total_amount: number | null
  updated_by: string | null
  updated_at: string
}

export interface LedgerEvent {
  id: number
  event_type: string
  ref_id: string | null
  actor_id: string | null
  payload: Record<string, unknown> | null
  prev_hash: string | null
  hash: string
  created_at: string
  // joined
  actor?: Profile
}

export interface Grievance {
  id: string
  contract_id: string
  filed_by: string
  reason: string | null
  description: string | null
  evidence_url: string | null
  status: GrievanceStatus
  admin_note: string | null
  created_at: string
  // joined
  contract?: Contract
  filer?: Profile
}

export interface LogisticsProvider {
  id: string
  name: string
  type: LogisticsType
  district: string
  contact_phone: string | null
  capacity_tons: number | null
  rate_per_km: number | null
  address: string | null
  is_active: boolean
}

export interface ForecastResult {
  recommendation: 'sell_now' | 'hold'
  confidence: number
  reason: string
}

export interface MatchScoreResult {
  score: number
  breakdown: {
    crop_match: number
    district_match: number
    quantity_fit: number
  }
}

export const CROPS = ['Wheat', 'Paddy', 'Cotton', 'Soybean', 'Tomato'] as const
export const DISTRICTS = ['Indore', 'Bhopal', 'Nagpur', 'Pune', 'Jaipur'] as const
export const MANDIS: Record<string, string> = {
  'Indore': 'Madhya Pradesh',
  'Bhopal': 'Madhya Pradesh',
  'Nagpur': 'Maharashtra',
  'Pune': 'Maharashtra',
  'Jaipur': 'Rajasthan',
}
export const GRADES = ['A', 'B', 'C', 'Premium'] as const
export const UNITS = ['quintal', 'kg', 'tonne'] as const
export const CROP_EMOJI: Record<string, string> = {
  'Wheat': '🌾',
  'Paddy': '🌾',
  'Cotton': '☁️',
  'Soybean': '🫘',
  'Tomato': '🍅',
}

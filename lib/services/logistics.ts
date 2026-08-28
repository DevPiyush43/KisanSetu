/**
 * Logistics Service
 * Transport cost estimation and cold storage lookup
 */

import { getDistance } from '@/lib/data/distances'

export interface TransportEstimate {
  from_district: string
  to_district: string
  distance_km: number
  quantity_quintals: number
  quantity_tonnes: number
  rate_per_km: number
  transport_cost: number
  cost_per_quintal: number
  estimated_hours: number  // rough travel time
}

const DEFAULT_RATE_PER_KM = 8     // ₹ per km per tonne
const AVG_SPEED_KMH = 60          // average truck speed

/** Estimate transport cost between two districts */
export function estimateTransportCost(
  fromDistrict: string,
  toDistrict: string,
  quantityQuintals: number,
  ratePerKm = DEFAULT_RATE_PER_KM,
): TransportEstimate {
  const distance_km = getDistance(fromDistrict, toDistrict)
  const quantity_tonnes = quantityQuintals / 10
  const transport_cost = Math.round(ratePerKm * distance_km * quantity_tonnes)
  const cost_per_quintal = quantityQuintals > 0 ? Math.round(transport_cost / quantityQuintals) : 0
  const estimated_hours = Math.ceil(distance_km / AVG_SPEED_KMH)

  return {
    from_district: fromDistrict,
    to_district: toDistrict,
    distance_km,
    quantity_quintals: quantityQuintals,
    quantity_tonnes,
    rate_per_km: ratePerKm,
    transport_cost,
    cost_per_quintal,
    estimated_hours,
  }
}

/** Format transport estimate as human-readable string */
export function formatTransportEstimate(est: TransportEstimate): string {
  return (
    `Distance: ${est.distance_km} km | ` +
    `Transport: ₹${est.transport_cost.toLocaleString('en-IN')} | ` +
    `(₹${est.cost_per_quintal}/quintal) | ` +
    `~${est.estimated_hours}h travel`
  )
}

/**
 * Best Price (Net Profit) Calculator
 * Ranks buyer offers by transport-cost-adjusted net profit
 */

import { getDistance } from '@/lib/data/distances'

export interface BuyerOfferInput {
  buyer_id: string
  buyer_name: string
  buyer_district: string
  offer_price: number           // ₹ per quintal
  quantity: number              // quintals
  trust_score: number           // 0-100
  payment_success_rate: number  // 0-100%
  kyc_verified: boolean
}

export interface RankedOffer extends BuyerOfferInput {
  distance_km: number
  transport_cost: number            // total ₹
  transport_cost_per_quintal: number
  gross_revenue: number
  net_profit: number
  net_price_per_unit: number        // ₹/quintal after transport
  is_best: boolean
  rank: number
  savings_vs_highest_offer: number  // vs highest gross offer (can be negative)
}

export interface BestPriceResult {
  rankings: RankedOffer[]
  recommendation: string
  best_deal_id: string | null
}

const DEFAULT_RATE_PER_KM = 8   // ₹ per km per tonne
const KM_BELOW_WHICH_FREE = 10  // no transport cost for same-district

/**
 * Calculate transport cost
 * rate × distance × quantity_in_tonnes
 * @param ratePerKm ₹ per km per tonne (from logistics_providers or default)
 */
export function calculateTransportCost(
  fromDistrict: string,
  toDistrict: string,
  quantityQuintals: number,
  ratePerKm: number = DEFAULT_RATE_PER_KM,
): { distance_km: number; transport_cost: number; transport_cost_per_quintal: number } {
  const distance_km = getDistance(fromDistrict, toDistrict)

  if (distance_km <= KM_BELOW_WHICH_FREE) {
    return { distance_km, transport_cost: 0, transport_cost_per_quintal: 0 }
  }

  const quantityTonnes = quantityQuintals / 10
  const transport_cost = ratePerKm * distance_km * quantityTonnes
  const transport_cost_per_quintal = transport_cost / quantityQuintals

  return {
    distance_km,
    transport_cost: Math.round(transport_cost),
    transport_cost_per_quintal: Math.round(transport_cost_per_quintal),
  }
}

/**
 * Rank buyer offers by net profit (after transport costs)
 */
export function rankBuyerOffers(
  offers: BuyerOfferInput[],
  farmerDistrict: string,
  ratePerKm: number = DEFAULT_RATE_PER_KM,
): BestPriceResult {
  if (offers.length === 0) {
    return { rankings: [], recommendation: 'No offers available yet.', best_deal_id: null }
  }

  const highestGrossPrice = Math.max(...offers.map(o => o.offer_price))

  const ranked: Omit<RankedOffer, 'is_best' | 'rank'>[] = offers.map(offer => {
    const { distance_km, transport_cost, transport_cost_per_quintal } = calculateTransportCost(
      farmerDistrict,
      offer.buyer_district,
      offer.quantity,
      ratePerKm,
    )

    const gross_revenue = offer.offer_price * offer.quantity
    const net_profit = gross_revenue - transport_cost
    const net_price_per_unit = net_profit / offer.quantity
    const savings_vs_highest_offer = net_profit - (highestGrossPrice * offer.quantity)

    return {
      ...offer,
      distance_km,
      transport_cost,
      transport_cost_per_quintal,
      gross_revenue: Math.round(gross_revenue),
      net_profit: Math.round(net_profit),
      net_price_per_unit: Math.round(net_price_per_unit),
      savings_vs_highest_offer: Math.round(savings_vs_highest_offer),
    }
  })

  // Sort by net_profit descending
  ranked.sort((a, b) => b.net_profit - a.net_profit)

  const best = ranked[0]
  const rankings: RankedOffer[] = ranked.map((o, i) => ({
    ...o,
    is_best: i === 0,
    rank: i + 1,
  }))

  const recommendation = best
    ? `Best deal: ${best.buyer_name} (${best.buyer_district}, ${best.distance_km} km away) — ` +
      `offers ₹${best.offer_price}/q but nets ₹${best.net_price_per_unit}/q after ₹${best.transport_cost} transport cost. ` +
      (best.savings_vs_highest_offer > 0
        ? `Saves ₹${Math.abs(best.savings_vs_highest_offer).toLocaleString('en-IN')} vs highest offer.`
        : `Higher-priced offers lose to transport costs.`)
    : 'No offers to compare.'

  return {
    rankings,
    recommendation,
    best_deal_id: best ? best.buyer_id : null,
  }
}

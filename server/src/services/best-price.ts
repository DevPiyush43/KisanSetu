import { getDistance } from '../data/distances.js'

export interface BuyerOfferInput {
  buyer_id: string
  buyer_name: string
  buyer_district: string
  offer_price: number
  quantity: number
  trust_score: number
  payment_success_rate: number
  kyc_verified: boolean
}

export interface RankedOffer extends BuyerOfferInput {
  distance_km: number
  transport_cost: number
  transport_cost_per_quintal: number
  gross_revenue: number
  net_profit: number
  net_price_per_unit: number
  is_best: boolean
  rank: number
  savings_vs_highest_offer: number
}

export interface BestPriceResult {
  rankings: RankedOffer[]
  recommendation: string
  best_deal_id: string | null
}

const DEFAULT_RATE_PER_KM = 8
const KM_BELOW_WHICH_FREE = 10

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

export function rankBuyerOffers(
  offers: BuyerOfferInput[],
  farmerDistrict: string,
  ratePerKm: number = DEFAULT_RATE_PER_KM,
): BestPriceResult {
  if (offers.length === 0) {
    return { rankings: [], recommendation: 'No offers available yet.', best_deal_id: null }
  }

  const highestGrossPrice = Math.max(...offers.map(o => o.offer_price))

  const ranked = offers.map(offer => {
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

  ranked.sort((a, b) => b.net_profit - a.net_profit)

  const best = ranked[0]
  const rankings: RankedOffer[] = ranked.map((o, i) => ({
    ...o,
    is_best: i === 0,
    rank: i + 1,
  }))

  const recommendation = best
    ? `Best deal: ${best.buyer_name} (${best.buyer_district}, ${best.distance_km} km away) — ` +
      `offers ₹${best.offer_price}/q but nets ₹${best.net_price_per_unit}/q after ₹${best.transport_cost} transport cost.`
    : 'No offers to compare.'

  return { rankings, recommendation, best_deal_id: best ? best.buyer_id : null }
}

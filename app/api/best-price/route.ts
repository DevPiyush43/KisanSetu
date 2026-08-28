import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rankBuyerOffers, BuyerOfferInput } from '@/lib/services/best-price'

export async function POST(request: Request) {
  try {
    const {
      lot_id,
      farmer_district,
      quantity,
    }: { lot_id: string; farmer_district: string; quantity: number } = await request.json()

    if (!lot_id || !farmer_district || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch all accepted/pending offers for this lot with buyer profiles
    const { data: offers, error } = await supabase
      .from('offers')
      .select(`
        id,
        offered_price,
        offered_quantity,
        status,
        buyer:profiles!offers_buyer_id_fkey(
          id, full_name, district, trust_score, kyc_status
        )
      `)
      .eq('lot_id', lot_id)
      .in('status', ['pending', 'accepted', 'countered'])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch transport rate from logistics_providers (or use default)
    const { data: logistics } = await supabase
      .from('logistics_providers')
      .select('rate_per_km')
      .eq('type', 'transporter')
      .limit(1)
      .single()

    const ratePerKm = logistics?.rate_per_km ?? 8

    // Build offer inputs
    const offerInputs: BuyerOfferInput[] = (offers ?? []).map((o: any) => ({
      buyer_id: o.buyer?.id ?? o.id,
      buyer_name: o.buyer?.full_name ?? 'Unknown Buyer',
      buyer_district: o.buyer?.district ?? farmer_district,
      offer_price: o.offered_price,
      quantity: o.offered_quantity ?? quantity,
      trust_score: o.buyer?.trust_score ?? 50,
      payment_success_rate: Math.min(95, (o.buyer?.trust_score ?? 50) + 10),
      kyc_verified: o.buyer?.kyc_status === 'verified',
    }))

    const result = rankBuyerOffers(offerInputs, farmer_district, ratePerKm)

    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to rank offers' }, { status: 500 })
  }
}

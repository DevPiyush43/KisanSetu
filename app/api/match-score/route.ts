import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { buyerId, lotId } = await request.json()
    const supabase = await createClient()

    // Fetch lot and buyer profile
    const [{ data: lot }, { data: buyer }] = await Promise.all([
      supabase.from('lots').select('crop, location_district, quantity').eq('id', lotId).single(),
      supabase.from('profiles').select('operating_districts, primary_crops').eq('id', buyerId).single(),
    ])

    if (!lot || !buyer) {
      return NextResponse.json({ score: 50, breakdown: { crop_match: 15, district_match: 20, quantity_fit: 15 } })
    }

    // TODO(phase-2): Replace with collaborative filtering / ML-based personalized matching
    let cropScore = 0
    let districtScore = 0
    let quantityScore = 0

    // Crop match: check if buyer has ordered this crop before (via past offers)
    const { data: pastOffers } = await supabase
      .from('offers')
      .select('lots(crop)')
      .eq('buyer_id', buyerId)
      .limit(20)

    const pastCrops = (pastOffers ?? []).map((o: any) => o.lots?.crop).filter(Boolean)
    if (pastCrops.includes(lot.crop)) {
      cropScore = 40
    } else {
      cropScore = 15 // partial — buyer may still want it
    }

    // District match
    const operatingDistricts = buyer.operating_districts ?? []
    if (operatingDistricts.includes(lot.location_district)) {
      districtScore = 35
    } else {
      districtScore = 10
    }

    // Quantity fit: ideal 10-500 quintals for most buyers
    const qty = lot.quantity ?? 0
    if (qty >= 10 && qty <= 500) {
      quantityScore = 25
    } else if (qty > 500) {
      quantityScore = 15
    } else {
      quantityScore = 8
    }

    const score = Math.min(cropScore + districtScore + quantityScore, 100)

    return NextResponse.json({
      score,
      breakdown: { crop_match: cropScore, district_match: districtScore, quantity_fit: quantityScore }
    })
  } catch {
    return NextResponse.json({ score: 50, breakdown: { crop_match: 15, district_match: 20, quantity_fit: 15 } })
  }
}

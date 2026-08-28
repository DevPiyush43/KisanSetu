import { NextRequest, NextResponse } from 'next/server'
import { predictPriceWithAI } from '@/lib/services/gemini'

export async function POST(req: NextRequest) {
  try {
    const { crop, district, prices } = await req.json()

    if (!crop || !prices || !Array.isArray(prices) || prices.length < 3) {
      return NextResponse.json({ error: 'Crop and at least 3 price points required' }, { status: 400 })
    }

    const prediction = await predictPriceWithAI(
      crop,
      district || 'All India',
      prices,
    )

    return NextResponse.json({ prediction })
  } catch (error: any) {
    console.error('AI Price prediction error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to predict price' },
      { status: 500 },
    )
  }
}

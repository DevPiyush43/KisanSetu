import { NextRequest, NextResponse } from 'next/server'
import { recommendCropsWithAI } from '@/lib/services/gemini'

export async function POST(req: NextRequest) {
  try {
    const { state, district, season, soilType, waterAvailability } = await req.json()

    if (!district || !season) {
      return NextResponse.json({ error: 'District and season are required' }, { status: 400 })
    }

    const recommendations = await recommendCropsWithAI(
      state || '',
      district,
      season,
      soilType || 'alluvial',
      waterAvailability || 'medium',
    )

    return NextResponse.json({ recommendations })
  } catch (error: any) {
    console.error('Crop recommendation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate crop recommendations' },
      { status: 500 },
    )
  }
}

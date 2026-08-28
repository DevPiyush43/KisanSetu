import { NextRequest, NextResponse } from 'next/server'
import { assessQualityWithAI } from '@/lib/services/gemini'

export async function POST(req: NextRequest) {
  try {
    const { crop, moisture, foreignMatter, damagePercent, storageMethod, daysSinceHarvest } = await req.json()

    if (!crop) {
      return NextResponse.json({ error: 'Crop name is required' }, { status: 400 })
    }

    const assessment = await assessQualityWithAI(
      crop,
      moisture || 'unknown',
      foreignMatter || 'unknown',
      damagePercent || 'none',
      storageMethod || 'open',
      daysSinceHarvest ?? 7,
    )

    return NextResponse.json({ assessment })
  } catch (error: any) {
    console.error('Quality assessment error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to assess quality' },
      { status: 500 },
    )
  }
}

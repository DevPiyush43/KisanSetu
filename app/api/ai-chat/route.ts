import { NextRequest, NextResponse } from 'next/server'
import { chatWithFarmingAI } from '@/lib/services/gemini'

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const reply = await chatWithFarmingAI(message, context)

    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('AI Chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI response' },
      { status: 500 },
    )
  }
}

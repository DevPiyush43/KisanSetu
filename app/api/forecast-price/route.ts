import { NextResponse } from 'next/server'
import { computeSlope } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const { crop, mandi, prices }: { crop: string; mandi: string; prices: number[] } = await request.json()

    if (!prices || prices.length < 3) {
      return NextResponse.json({
        recommendation: 'sell_now',
        confidence: 0.45,
        reason: 'Insufficient price history. Selling now avoids storage risks.',
      })
    }

    // Heuristic: 7-day moving average slope
    // TODO(phase-2): Replace with ARIMA/Prophet ML model served via FastAPI
    const recent = prices.slice(-7)
    const slope = computeSlope(recent)
    const avgPrice = recent.reduce((a, b) => a + b, 0) / recent.length
    const slopePct = (slope / avgPrice) * 100

    let recommendation: 'sell_now' | 'hold'
    let confidence: number
    let reason: string

    if (slopePct > 1.5) {
      recommendation = 'hold'
      confidence = Math.min(0.55 + slopePct * 0.05, 0.92)
      reason = `${crop} prices in ${mandi} are trending upward (+${slopePct.toFixed(1)}%/day avg). Holding for 3-5 days may yield better returns if storage is available.`
    } else if (slopePct < -1.5) {
      recommendation = 'sell_now'
      confidence = Math.min(0.55 + Math.abs(slopePct) * 0.05, 0.90)
      reason = `${crop} prices are declining (${slopePct.toFixed(1)}%/day avg). Selling now minimizes further loss. Consider locking in current rates.`
    } else {
      recommendation = 'sell_now'
      confidence = 0.52
      reason = `${crop} prices in ${mandi} are relatively stable (±1.5%/day). Current price is within normal range — selling now avoids storage cost and uncertainty.`
    }

    return NextResponse.json({ recommendation, confidence: parseFloat(confidence.toFixed(2)), reason })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to compute forecast' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { holtWintersPredict, calculateTrend } from '@/lib/services/price-prediction'

export async function POST(request: Request) {
  try {
    const {
      crop,
      mandi,
      prices,
    }: { crop: string; mandi: string; prices: number[] } = await request.json()

    if (!prices || prices.length < 3) {
      return NextResponse.json({
        recommendation: 'sell_now',
        confidence: 0.45,
        reason: 'Insufficient price history. Selling now avoids storage risks.',
        predicted_prices: [],
        trend: 'stable',
      })
    }

    // Holt-Winters Double Smoothing
    const result = holtWintersPredict(prices, 7)
    const trend = calculateTrend(prices)

    let recommendation: 'sell_now' | 'hold'
    let reason: string

    if (trend === 'rising') {
      recommendation = 'hold'
      reason = `${crop} prices in ${mandi} are trending upward. Predicted to rise by ₹${
        Math.round((result.predicted_prices[6]?.price ?? 0) - (prices[prices.length - 1] ?? 0))
      } over 7 days. Holding for 3-5 days may yield better returns if storage is available.`
    } else if (trend === 'falling') {
      recommendation = 'sell_now'
      reason = `${crop} prices are declining in ${mandi}. Selling now minimizes further losses. Consider locking in current rates quickly.`
    } else {
      recommendation = 'sell_now'
      reason = `${crop} prices in ${mandi} are relatively stable. Selling now avoids storage costs and uncertainty.`
    }

    return NextResponse.json({
      recommendation,
      confidence: result.confidence,
      reason,
      predicted_prices: result.predicted_prices,
      trend,
      trend_strength: result.trend_strength,
      method: result.method,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to compute forecast' }, { status: 500 })
  }
}

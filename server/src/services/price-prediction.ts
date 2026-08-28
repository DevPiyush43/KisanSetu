export interface PredictionResult {
  predicted_prices: Array<{
    date: string
    price: number
    confidence_low: number
    confidence_high: number
  }>
  trend: 'rising' | 'falling' | 'stable'
  trend_strength: number
  confidence: number
  method: string
}

function doubleSmoothing(
  prices: number[],
  alpha = 0.3,
  beta = 0.1,
): { levels: number[]; trends: number[] } {
  if (prices.length < 2) {
    return { levels: prices, trends: [0] }
  }
  const levels: number[] = [prices[0]]
  const trends: number[] = [prices[1] - prices[0]]

  for (let i = 1; i < prices.length; i++) {
    const l = alpha * prices[i] + (1 - alpha) * (levels[i - 1] + trends[i - 1])
    const t = beta * (l - levels[i - 1]) + (1 - beta) * trends[i - 1]
    levels.push(l)
    trends.push(t)
  }
  return { levels, trends }
}

export function holtWintersPredict(
  prices: number[],
  daysAhead: number,
  alpha = 0.3,
  beta = 0.1,
): PredictionResult {
  if (prices.length < 3) {
    return {
      predicted_prices: [],
      trend: 'stable',
      trend_strength: 0,
      confidence: 0.4,
      method: 'insufficient_data',
    }
  }

  const { levels, trends } = doubleSmoothing(prices, alpha, beta)
  const lastLevel = levels[levels.length - 1]
  const lastTrend = trends[trends.length - 1]

  const predictions: number[] = []
  for (let h = 1; h <= daysAhead; h++) {
    predictions.push(Math.max(0, lastLevel + h * lastTrend))
  }

  const fitted = levels.slice(1)
  const actuals = prices.slice(1)
  const residuals = fitted.map((f, i) => actuals[i] - f)
  const residualStd = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(residuals.length - 1, 1))

  const today = new Date()
  const predicted_prices = predictions.map((price, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i + 1)
    const uncertainty = residualStd * Math.sqrt(i + 1) * 1.2
    return {
      date: d.toISOString().split('T')[0],
      price: Math.round(price),
      confidence_low: Math.round(Math.max(0, price - uncertainty)),
      confidence_high: Math.round(price + uncertainty),
    }
  })

  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
  const slopePct = avgPrice > 0 ? (lastTrend / avgPrice) * 100 : 0
  const trend = slopePct > 1.5 ? 'rising' : slopePct < -1.5 ? 'falling' : 'stable'
  const trend_strength = Math.min(Math.abs(slopePct) / 5, 1)

  const cv = residualStd / (avgPrice || 1)
  const confidence = Math.max(0.35, Math.min(0.92, 0.7 - cv + prices.length / 60))

  return {
    predicted_prices,
    trend,
    trend_strength,
    confidence: parseFloat(confidence.toFixed(2)),
    method: 'holt_winters_double',
  }
}

export function calculateTrend(prices: number[]): 'rising' | 'falling' | 'stable' {
  if (prices.length < 3) return 'stable'
  const recent = prices.slice(-7)
  const n = recent.length
  const xMean = (n - 1) / 2
  const yMean = recent.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (recent[i] - yMean)
    den += (i - xMean) ** 2
  }
  const slope = den === 0 ? 0 : num / den
  const slopePct = yMean > 0 ? (slope / yMean) * 100 : 0
  return slopePct > 1.5 ? 'rising' : slopePct < -1.5 ? 'falling' : 'stable'
}

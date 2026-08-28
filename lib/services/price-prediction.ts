/**
 * Price Prediction Service
 * Implements Triple Exponential Smoothing (Holt-Winters) for price forecasting
 */

export interface PredictionResult {
  predicted_prices: Array<{
    date: string
    price: number
    confidence_low: number
    confidence_high: number
  }>
  trend: 'rising' | 'falling' | 'stable'
  trend_strength: number   // 0-1
  confidence: number       // 0-1
  method: string
}

export interface SellOrStoreResult {
  recommendation: 'sell_now' | 'store'
  holdDays: number
  expectedGainAfterStorage: number
  storageCostTotal: number
  netBenefit: number
  reason: string
  warning: string | null
}

/** Single Exponential Smoothing (EMA) */
export function exponentialSmoothing(prices: number[], alpha: number): number[] {
  if (prices.length === 0) return []
  const result: number[] = [prices[0]]
  for (let i = 1; i < prices.length; i++) {
    result.push(alpha * prices[i] + (1 - alpha) * result[i - 1])
  }
  return result
}

/** Double Exponential Smoothing (Holt's) - level + trend */
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

/**
 * Holt-Winters Triple Exponential Smoothing
 * Predicts N days ahead based on historical prices
 */
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

  // Generate predictions
  const predictions: number[] = []
  for (let h = 1; h <= daysAhead; h++) {
    predictions.push(Math.max(0, lastLevel + h * lastTrend))
  }

  // Calculate residuals for confidence interval
  const fitted = levels.slice(1)
  const actuals = prices.slice(1)
  const residuals = fitted.map((f, i) => actuals[i] - f)
  const residualStd = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(residuals.length - 1, 1))

  // Build output with CI
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

  // Classify trend
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
  const slopePct = avgPrice > 0 ? (lastTrend / avgPrice) * 100 : 0
  const trend = slopePct > 1.5 ? 'rising' : slopePct < -1.5 ? 'falling' : 'stable'
  const trend_strength = Math.min(Math.abs(slopePct) / 5, 1)

  // Confidence based on data quantity and stability
  const cv = residualStd / (avgPrice || 1) // coefficient of variation
  const confidence = Math.max(0.35, Math.min(0.92, 0.7 - cv + prices.length / 60))

  return {
    predicted_prices,
    trend,
    trend_strength,
    confidence: parseFloat(confidence.toFixed(2)),
    method: 'holt_winters_double',
  }
}

/** Classify price trend direction */
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

/** Sell now vs store decision engine */
export function sellOrStoreAdvice(params: {
  crop: string
  district: string
  currentPrice: number
  quantity: number              // in quintals
  predictedPrices: number[]    // next 7 days
  storageCostPerDay?: number   // ₹/quintal/day, default 5
  hasColdStorage?: boolean
}): SellOrStoreResult {
  const {
    currentPrice,
    quantity,
    predictedPrices,
    storageCostPerDay = 5,
    hasColdStorage = false,
    crop,
    district,
  } = params

  if (predictedPrices.length === 0) {
    return {
      recommendation: 'sell_now',
      holdDays: 0,
      expectedGainAfterStorage: 0,
      storageCostTotal: 0,
      netBenefit: 0,
      reason: 'Insufficient price forecast data. Selling now avoids storage risk.',
      warning: hasColdStorage ? null : `No cold storage detected near ${district}.`,
    }
  }

  // Find optimal hold day
  let bestNetBenefit = 0
  let bestDay = 0
  let bestGain = 0
  let bestCost = 0

  for (let day = 1; day <= predictedPrices.length; day++) {
    const futurePrice = predictedPrices[day - 1]
    const priceGain = (futurePrice - currentPrice) * quantity
    const storageCost = storageCostPerDay * quantity * day
    const netBenefit = priceGain - storageCost

    if (netBenefit > bestNetBenefit) {
      bestNetBenefit = netBenefit
      bestDay = day
      bestGain = priceGain
      bestCost = storageCost
    }
  }

  const MIN_BENEFIT_THRESHOLD = 500 // ₹500 minimum to be worth storing

  if (bestNetBenefit > MIN_BENEFIT_THRESHOLD && bestDay > 0) {
    return {
      recommendation: 'store',
      holdDays: bestDay,
      expectedGainAfterStorage: Math.round(bestGain),
      storageCostTotal: Math.round(bestCost),
      netBenefit: Math.round(bestNetBenefit),
      reason: `${crop} prices are predicted to rise by ₹${Math.round(bestGain / quantity)}/q in ${bestDay} days. Storing yields ₹${Math.round(bestNetBenefit).toLocaleString('en-IN')} net benefit after storage costs.`,
      warning: hasColdStorage ? null : `⚠️ No cold storage detected near ${district} — sell within 2 days if perishable.`,
    }
  }

  return {
    recommendation: 'sell_now',
    holdDays: 0,
    expectedGainAfterStorage: 0,
    storageCostTotal: 0,
    netBenefit: 0,
    reason: `Storage costs (₹${storageCostPerDay}/q/day × ${quantity}q) outweigh the predicted price gain. Selling now is optimal.`,
    warning: hasColdStorage ? null : `No cold storage nearby in ${district}.`,
  }
}

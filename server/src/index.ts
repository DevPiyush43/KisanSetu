import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { holtWintersPredict, calculateTrend } from './services/price-prediction.js'
import { rankBuyerOffers } from './services/best-price.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'KisanSetu Backend API Server', timestamp: new Date() })
})

// Price Forecast API
app.post('/api/forecast-price', (req, res) => {
  try {
    const { crop, mandi, prices } = req.body
    if (!prices || !Array.isArray(prices) || prices.length < 3) {
      res.json({
        recommendation: 'sell_now',
        confidence: 0.45,
        reason: 'Insufficient price history. Selling now avoids storage risks.',
        predicted_prices: [],
        trend: 'stable',
      })
      return
    }

    const result = holtWintersPredict(prices, 7)
    const trend = calculateTrend(prices)

    let recommendation: 'sell_now' | 'hold' = 'sell_now'
    let reason = `${crop} prices in ${mandi} are relatively stable.`

    if (trend === 'rising') {
      recommendation = 'hold'
      reason = `${crop} prices in ${mandi} are trending upward. Holding for 3-5 days may yield better returns.`
    } else if (trend === 'falling') {
      recommendation = 'sell_now'
      reason = `${crop} prices are declining in ${mandi}. Selling now minimizes further losses.`
    }

    res.json({
      recommendation,
      confidence: result.confidence,
      reason,
      predicted_prices: result.predicted_prices,
      trend,
      trend_strength: result.trend_strength,
      method: result.method,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to compute forecast' })
  }
})

// Best Price Ranking API
app.post('/api/best-price', (req, res) => {
  try {
    const { offers, farmer_district, rate_per_km } = req.body
    if (!offers || !Array.isArray(offers) || !farmer_district) {
      res.status(400).json({ error: 'Missing required parameters' })
      return
    }
    const result = rankBuyerOffers(offers, farmer_district, rate_per_km || 8)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to rank offers' })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 KisanSetu Backend API Server listening on port ${PORT}`)
})

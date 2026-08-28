// Google Gemini AI Service Layer for KisanSetu
// Requires GEMINI_API_KEY in environment variables

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODEL = 'gemini-1.5-flash'

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
  error?: { message: string }
}

async function callGemini(
  prompt: string,
  systemInstruction: string,
  model: string = DEFAULT_MODEL,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`

  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data: GeminiResponse = await res.json()

  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.message}`)
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response generated.'
}

// ─── SYSTEM PROMPTS ──────────────────────────────────────────────

const FARMING_ASSISTANT_PROMPT = `You are KisanSetu AI — an expert Indian agricultural advisor built for the KisanSetu platform (a Government of India initiative for transparent farmer-buyer market linkage).

CRITICAL RULES:
1. You MUST respond in the SAME LANGUAGE as the user's message (Hindi → Hindi, English → English, mixed → Hindi).
2. You are ONLY allowed to answer questions related to agriculture, farming, mandi prices, crops, soil, weather, government schemes for farmers, and rural market linkage.
3. For non-agricultural questions, politely redirect: "मैं केवल कृषि से संबंधित प्रश्नों का उत्तर दे सकता हूँ।"
4. Always be practical, actionable, and farmer-friendly. Use simple language.
5. If quoting prices, always mention "approximate" and recommend checking local mandi rates.
6. Reference Indian agricultural context: MSP, APMC, eNAM, PM-KISAN, Kisan Credit Card, etc.
7. NEVER mention any hackathon, competition, SIH, or problem statement numbers.
8. You ARE KisanSetu's official AI assistant — act as part of the platform.

FORMAT: Use bullet points for lists. Keep responses under 300 words. Add relevant emojis for readability (🌾🚜💰📊).`

const PRICE_PREDICTION_PROMPT = `You are an AI-powered agricultural market analyst for India. Analyze the provided mandi price data and generate a market outlook.

INPUT: You will receive crop name, mandi/district, and recent price history (in ₹/quintal).

OUTPUT FORMAT (strict JSON):
{
  "trend": "rising" | "falling" | "stable",
  "confidence": 0.0 to 1.0,
  "recommendation": "hold" | "sell_now",
  "reason": "2-3 sentence explanation in simple language",
  "predicted_range": { "low": number, "high": number },
  "factors": ["factor1", "factor2"],
  "advisory": "One line advice for the farmer"
}

Consider: seasonal demand, MSP rates, festival seasons, monsoon impact, supply glut risks, government procurement patterns.`

const CROP_ADVISOR_PROMPT = `You are a crop recommendation engine for Indian farmers. Based on the provided location, season, soil type, and water availability, recommend the best 3-5 crops.

OUTPUT FORMAT (strict JSON array):
[
  {
    "crop": "Crop Name",
    "cropHi": "Hindi Name",
    "confidence": 0.0 to 1.0,
    "reason": "Why this crop suits the given conditions",
    "expectedYield": "X-Y quintals/acre",
    "estimatedRevenue": "₹X-₹Y per acre",
    "tips": "2-3 practical growing tips",
    "sowingMonth": "Month name",
    "harvestMonth": "Month name",
    "waterRequirement": "low" | "medium" | "high"
  }
]

Consider: local agro-climatic zones, MSP for the crop, market demand, water availability, and soil compatibility.`

const QUALITY_GRADING_PROMPT = `You are an agricultural produce quality assessment AI. Analyze the provided produce parameters and grade the produce.

INPUT: Crop type, moisture content, foreign matter %, damage %, storage method, days since harvest.

OUTPUT FORMAT (strict JSON):
{
  "grade": "Premium" | "A" | "B" | "C" | "Rejected",
  "score": 0-100,
  "factors": [
    { "parameter": "name", "status": "good" | "warning" | "critical", "detail": "explanation" }
  ],
  "recommendations": ["improvement tip 1", "tip 2"],
  "estimatedPriceImpact": "+X%" | "-X%",
  "storageAdvice": "Specific storage recommendation"
}`

// ─── PUBLIC API FUNCTIONS ────────────────────────────────────────

/** AI Chatbot — farming queries in Hindi/English */
export async function chatWithFarmingAI(
  userMessage: string,
  context?: { district?: string; crops?: string[]; language?: string },
): Promise<string> {
  const contextStr = context
    ? `\nUser context: District=${context.district ?? 'unknown'}, Crops=${context.crops?.join(', ') ?? 'unknown'}, Preferred language=${context.language ?? 'hi'}`
    : ''

  return callGemini(
    userMessage + contextStr,
    FARMING_ASSISTANT_PROMPT,
  )
}

/** AI Price Prediction */
export async function predictPriceWithAI(
  crop: string,
  district: string,
  recentPrices: number[],
): Promise<{
  trend: 'rising' | 'falling' | 'stable'
  confidence: number
  recommendation: 'hold' | 'sell_now'
  reason: string
  predicted_range: { low: number; high: number }
  factors: string[]
  advisory: string
}> {
  const prompt = `Crop: ${crop}\nMandi/District: ${district}\nRecent prices (₹/quintal, oldest to newest): ${recentPrices.join(', ')}\nTotal data points: ${recentPrices.length}\nLatest price: ₹${recentPrices[recentPrices.length - 1]}/quintal\nAverage: ₹${Math.round(recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length)}/quintal`

  const response = await callGemini(prompt, PRICE_PREDICTION_PROMPT)

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch { /* fallback below */ }

  return {
    trend: 'stable',
    confidence: 0.5,
    recommendation: 'sell_now',
    reason: 'Unable to parse AI response. Based on recent data, consider selling at current market rates.',
    predicted_range: {
      low: recentPrices[recentPrices.length - 1] * 0.95,
      high: recentPrices[recentPrices.length - 1] * 1.05,
    },
    factors: ['market conditions'],
    advisory: 'Check your local mandi for the latest rates.',
  }
}

/** AI Crop Recommendation */
export async function recommendCropsWithAI(
  state: string,
  district: string,
  season: string,
  soilType: string,
  waterAvailability: string,
): Promise<Array<{
  crop: string
  cropHi: string
  confidence: number
  reason: string
  expectedYield: string
  estimatedRevenue: string
  tips: string
  sowingMonth: string
  harvestMonth: string
  waterRequirement: string
}>> {
  const prompt = `State: ${state}\nDistrict: ${district}\nSeason: ${season}\nSoil Type: ${soilType}\nWater Availability: ${waterAvailability}`

  const response = await callGemini(prompt, CROP_ADVISOR_PROMPT)

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch { /* fallback below */ }

  return [{
    crop: 'Wheat',
    cropHi: 'गेहूं',
    confidence: 0.7,
    reason: 'Wheat is a safe rabi season crop suitable for most Indian regions.',
    expectedYield: '15-20 quintals/acre',
    estimatedRevenue: '₹30,000-₹45,000 per acre',
    tips: 'Use HD-2967 variety. Irrigate at crown root stage.',
    sowingMonth: 'November',
    harvestMonth: 'April',
    waterRequirement: 'medium',
  }]
}

/** AI Quality Assessment */
export async function assessQualityWithAI(
  crop: string,
  moisture: string,
  foreignMatter: string,
  damagePercent: string,
  storageMethod: string,
  daysSinceHarvest: number,
): Promise<{
  grade: string
  score: number
  factors: Array<{ parameter: string; status: string; detail: string }>
  recommendations: string[]
  estimatedPriceImpact: string
  storageAdvice: string
}> {
  const prompt = `Crop: ${crop}\nMoisture Content: ${moisture}\nForeign Matter: ${foreignMatter}\nDamage: ${damagePercent}\nStorage Method: ${storageMethod}\nDays Since Harvest: ${daysSinceHarvest}`

  const response = await callGemini(prompt, QUALITY_GRADING_PROMPT)

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch { /* fallback below */ }

  return {
    grade: 'B',
    score: 60,
    factors: [{ parameter: 'Overall', status: 'warning', detail: 'Could not perform detailed AI analysis' }],
    recommendations: ['Ensure proper storage', 'Get manual quality inspection at mandi'],
    estimatedPriceImpact: '0%',
    storageAdvice: 'Store in dry, ventilated area away from moisture.',
  }
}

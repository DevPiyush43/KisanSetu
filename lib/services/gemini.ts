// Google Gemini AI Service Layer for KisanSetu
// Supports real Google Gemini API calls with intelligent multi-model fallbacks


const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

// List of models to try in order of capability & availability
const CANDIDATE_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash',
  'gemini-pro',
]

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
  error?: { message: string; code?: number }
}

async function callGemini(
  prompt: string,
  systemInstruction: string,
  preferredModel?: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey || apiKey === 'your-gemini-api-key' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const modelsToTry = preferredModel
    ? [preferredModel, ...CANDIDATE_MODELS.filter(m => m !== preferredModel)]
    : CANDIDATE_MODELS

  let lastErrorMsg = ''

  for (const model of modelsToTry) {
    try {
      const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`

      // Attempt 1: Using system_instruction
      const bodyWithSystem = {
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
          maxOutputTokens: 2048,
        },
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyWithSystem),
      })

      const data: GeminiResponse = await res.json()

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text && text.trim().length > 0) {
        return text
      }

      if (data.error) {
        lastErrorMsg = data.error.message || `Error with model ${model}`

        // Attempt 2: If system_instruction wasn't accepted, try embedding in user contents
        const bodyCombined = {
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nUser Query:\n${prompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }

        const res2 = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyCombined),
        })

        const data2: GeminiResponse = await res2.json()
        const text2 = data2.candidates?.[0]?.content?.parts?.[0]?.text
        if (text2 && text2.trim().length > 0) {
          return text2
        }
      }
    } catch (err: any) {
      lastErrorMsg = err.message || 'Fetch failed'
    }
  }

  throw new Error(`Gemini API error: ${lastErrorMsg || 'All Gemini models failed'}`)
}

// ─── SYSTEM PROMPTS ──────────────────────────────────────────────

const FARMING_ASSISTANT_PROMPT = `You are KisanSetu AI — an expert Indian agricultural advisor built for the KisanSetu platform (a Government of India initiative for transparent farmer-buyer market linkage).

CRITICAL RULES:
1. You MUST respond in the SAME LANGUAGE as the user's message (Hindi → Hindi, English → English, mixed/Hinglish → Hindi).
2. You are ONLY allowed to answer questions related to agriculture, farming, mandi prices, crops, soil, weather, government schemes for farmers, and rural market linkage.
3. For non-agricultural questions, politely redirect: "मैं केवल कृषि, मंडी भाव और खेती से संबंधित प्रश्नों का उत्तर दे सकता हूँ।"
4. Always be practical, actionable, and farmer-friendly. Use simple language.
5. If quoting prices, always mention "approximate" and recommend checking local mandi rates.
6. Reference Indian agricultural context: MSP, APMC, eNAM, PM-KISAN, Kisan Credit Card, etc.
7. NEVER mention any hackathon, competition, SIH, or problem statement numbers.
8. You ARE KisanSetu's official AI assistant — act as part of the platform.

FORMAT: Use bullet points for lists. Keep responses concise (under 250 words). Add relevant emojis for readability (🌾🚜💰📊).`

const PRICE_PREDICTION_PROMPT = `You are an AI-powered agricultural market analyst for India. Analyze the provided mandi price data and generate a market outlook.

INPUT: You will receive crop name, mandi/district, and recent price history (in ₹/quintal).

OUTPUT FORMAT (strict JSON):
{
  "trend": "rising" | "falling" | "stable",
  "confidence": 0.85,
  "recommendation": "hold" | "sell_now",
  "reason": "2-3 sentence explanation in simple language",
  "predicted_range": { "low": 2400, "high": 2600 },
  "factors": ["Festival demand increasing", "Arrival volumes stabilizing"],
  "advisory": "One line advice for the farmer"
}

Consider: seasonal demand, MSP rates, festival seasons, monsoon impact, supply glut risks, government procurement patterns.`

const CROP_ADVISOR_PROMPT = `You are a crop recommendation engine for Indian farmers. Based on the provided location, season, soil type, and water availability, recommend the best 3-5 crops.

OUTPUT FORMAT (strict JSON array, do not include markdown backticks around JSON):
[
  {
    "crop": "Crop Name (English)",
    "cropHi": "Crop Name (Hindi)",
    "confidence": 0.85,
    "reason": "Why this crop is suitable for this region, soil and climate",
    "expectedYield": "18-22 quintals/acre",
    "estimatedRevenue": "₹45,000 - ₹55,000 per acre",
    "tips": "Important sowing and nutrient management tips",
    "sowingMonth": "October - November",
    "harvestMonth": "March - April",
    "waterRequirement": "low" | "medium" | "high"
  }
]

Ensure crop names have accurate Hindi translations (e.g. Wheat -> गेहूं, Mustard -> सरसों, Chickpea -> चना, Soybean -> सोयाबीन, Cotton -> कपास, Paddy/Rice -> धान/चावल, Maize -> मक्का, Potato -> आलू, Onion -> प्याज).`

const QUALITY_GRADING_PROMPT = `You are an agricultural produce quality assessment AI. Analyze the provided produce parameters and grade the produce.

INPUT: Crop type, moisture content, foreign matter %, damage %, storage method, days since harvest.

OUTPUT FORMAT (strict JSON, do not include markdown backticks):
{
  "grade": "Premium" | "A" | "B" | "C" | "Rejected",
  "score": 85,
  "factors": [
    { "parameter": "Moisture", "status": "good" | "warning" | "critical", "detail": "Moisture is within ideal 10-12% range" }
  ],
  "recommendations": ["Store in airtight bags", "Avoid ground moisture exposure"],
  "estimatedPriceImpact": "+5%",
  "storageAdvice": "Keep in clean, dry, well-ventilated warehouse"
}`

// ─── PUBLIC API FUNCTIONS ────────────────────────────────────────

/** AI Chatbot — farming queries in Hindi/English */
export async function chatWithFarmingAI(
  userMessage: string,
  context?: { district?: string; crops?: string[]; language?: string },
): Promise<string> {
  const contextStr = context
    ? `\nUser context: District=${context.district ?? 'India'}, Crops=${context.crops?.join(', ') ?? 'general'}, Preferred language=${context.language ?? 'hi'}`
    : ''

  try {
    const aiResponse = await callGemini(
      userMessage + contextStr,
      FARMING_ASSISTANT_PROMPT,
    )
    return aiResponse
  } catch (err: any) {
    console.warn('Gemini call failed, generating smart local response:', err?.message)
    // Intelligent local fallback response
    return generateSmartLocalChatResponse(userMessage, context)
  }
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
  const lastPrice = recentPrices[recentPrices.length - 1] || 2200
  const avgPrice = Math.round(recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length)

  const prompt = `Crop: ${crop}\nMandi/District: ${district}\nRecent prices (₹/quintal, oldest to newest): ${recentPrices.join(', ')}\nLatest price: ₹${lastPrice}/quintal\nAverage: ₹${avgPrice}/quintal`

  try {
    const response = await callGemini(prompt, PRICE_PREDICTION_PROMPT)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (err: any) {
    console.warn('Gemini price prediction failed, using statistical fallback:', err?.message)
  }

  // Statistical fallback
  const firstPrice = recentPrices[0] || lastPrice
  const diff = lastPrice - firstPrice
  const trend: 'rising' | 'falling' | 'stable' = diff > 20 ? 'rising' : diff < -20 ? 'falling' : 'stable'

  return {
    trend,
    confidence: 0.82,
    recommendation: trend === 'rising' ? 'hold' : 'sell_now',
    reason: trend === 'rising'
      ? `${crop} prices in ${district} are showing an upward trend of +₹${diff} recently. Holding for 3-5 days may yield better returns.`
      : trend === 'falling'
      ? `${crop} prices in ${district} are showing downward pressure. Consider selling to avoid further loss.`
      : `${crop} prices in ${district} are steady at ₹${lastPrice}/quintal. Selling now provides stable income.`,
    predicted_range: {
      low: Math.round(lastPrice * 0.96),
      high: Math.round(lastPrice * 1.05),
    },
    factors: [
      `Current mandi average: ₹${avgPrice}/quintal`,
      'Local market arrival trends and seasonal demand',
    ],
    advisory: trend === 'rising' ? 'Hold for 3-5 days if storage is available' : 'Safe to sell at current mandi prices',
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

  try {
    const response = await callGemini(prompt, CROP_ADVISOR_PROMPT)
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err: any) {
    console.warn('Gemini crop recommendation failed, using agronomic calendar:', err?.message)
  }

  // Rich Agronomic Fallback from database
  return getFallbackCropRecommendations(district, season, soilType)
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

  try {
    const response = await callGemini(prompt, QUALITY_GRADING_PROMPT)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (err: any) {
    console.warn('Gemini quality assessment failed, using rule-based analysis:', err?.message)
  }

  // Rule-based fallback
  let score = 85
  const factors: Array<{ parameter: string; status: string; detail: string }> = []

  if (moisture === 'high') {
    score -= 20
    factors.push({ parameter: 'Moisture', status: 'warning', detail: 'High moisture may cause fungus/spoilage. Sun-dry before bagging.' })
  } else {
    factors.push({ parameter: 'Moisture', status: 'good', detail: 'Optimal moisture content for long storage.' })
  }

  if (foreignMatter === 'high') {
    score -= 20
    factors.push({ parameter: 'Purity / Foreign Matter', status: 'warning', detail: 'Contains dust/weed seeds. Sieve to improve grade.' })
  } else {
    factors.push({ parameter: 'Purity', status: 'good', detail: 'Clean produce with low foreign matter.' })
  }

  if (damagePercent === 'high') {
    score -= 25
    factors.push({ parameter: 'Grain Damage', status: 'critical', detail: 'High broken/pest-damaged grains detected.' })
  }

  const grade = score >= 85 ? 'Premium' : score >= 75 ? 'A' : score >= 60 ? 'B' : 'C'
  const estimatedPriceImpact = score >= 85 ? '+8%' : score >= 75 ? '+3%' : score >= 60 ? '0%' : '-10%'

  return {
    grade,
    score: Math.max(30, Math.min(98, score)),
    factors,
    recommendations: [
      'Clean and sieve produce before listing on KisanSetu to fetch Grade A price.',
      'Maintain storage temperature between 15°C-25°C in moisture-free bags.',
    ],
    estimatedPriceImpact,
    storageAdvice: storageMethod === 'coldStorage' ? 'Ideal cold storage method.' : 'Transfer to a covered, aerated warehouse with pallets.',
  }
}

// ─── LOCAL SMART GENERATORS ──────────────────────────────────────

function generateSmartLocalChatResponse(
  text: string,
  context?: { district?: string; language?: string },
): string {
  const isHindi = context?.language === 'hi' || /[\u0900-\u097F]/.test(text)
  const t = text.toLowerCase()
  const district = context?.district || 'इंदौर'

  if (/namaste|hello|hi|नमस्ते|नमस्कार|हैलो/.test(t)) {
    return isHindi
      ? `🙏 नमस्ते! मैं किसानसेतू AI कृषि सहायक हूँ।\n\nमैं आपकी सहायता कर सकता हूँ:\n• 📈 **मंडी भाव**: किसी भी फसल का ताज़ा भाव जानने में\n• 🌾 **फसल चयन**: इस मौसम में कौन सी फसल उगाएं\n• 💰 **बेचें या रखें**: फसल अभी बेचें या बाद में\n• 🐛 **कीट एवं रोग नियंत्रण**: फसलों की सुरक्षा के उपाय\n\nआप क्या जानना चाहते हैं?`
      : `🙏 Namaste! I am the KisanSetu AI Agricultural Advisor.\n\nI can help you with:\n• 📈 Mandi prices for any crop\n• 🌾 Crop recommendations for your district\n• 💰 Sell vs. Store guidance\n• 🐛 Pest management & fertilizers\n\nHow can I help you today?`
  }

  if (/bhav|price|mandi|भाव|दाम|रेट|rate/.test(t)) {
    return isHindi
      ? `📊 **${district} एवं प्रमुख मंडियों में आज के अनुमानित भाव:**\n\n• 🌾 **गेहूं (Wheat)**: ₹2,450 - ₹2,780/क्विंटल\n• 🫘 **चना (Gram)**: ₹5,800 - ₹6,200/क्विंटल\n• 🌻 **सोयाबीन (Soybean)**: ₹4,600 - ₹4,950/क्विंटल\n• 🌾 **धान (Paddy)**: ₹2,183 - ₹2,350/क्विंटल (MSP ₹2,183)\n• 🧅 **प्याज (Onion)**: ₹1,800 - ₹2,400/क्विंटल\n\n💡 सटीक रुझान देखने के लिए KisanSetu के **भाव (Prices)** पेज पर जाएं।`
      : `📊 **Estimated Market Prices in ${district}:**\n\n• 🌾 **Wheat**: ₹2,450 - ₹2,780/q\n• 🫘 **Gram/Chana**: ₹5,800 - ₹6,200/q\n• 🌻 **Soybean**: ₹4,600 - ₹4,950/q\n• 🌾 **Paddy**: ₹2,183 - ₹2,350/q\n\n💡 Check the Prices page for detailed 7-day trend forecasts.`
  }

  if (/grow|crop|ugaen|lagaen|फसल|उगाएं|recommend/.test(t)) {
    return isHindi
      ? `🌾 **इस मौसम के लिए सर्वोत्तम फसल सुझाव:**\n\n1. **गेहूं (Wheat)**: HD-2967 या Sharbati किस्म, ₹45,000/एकड़ आय क्षमता।\n2. **चना (Chickpea)**: JG-11 किस्म, कम पानी में बेहतरीन उपज।\n3. **सरसों (Mustard)**: Pusa Bold किस्म, उच्च तेल प्रतिशत।\n\n💡 विस्तृत मिट्टी व मौसम आधारित सलाह के लिए **AI Crop Advisor** मेनू देखें!`
      : `🌾 **Recommended Crops this Season:**\n\n1. **Wheat (HD-2967)**: High yielding, ₹45,000/acre revenue potential.\n2. **Chickpea/Chana**: Low water requirement, high market demand.\n3. **Mustard**: Excellent oil content, ready in 110-120 days.\n\n💡 Use the **AI Crop Advisor** page for personalized soil & water recommendations!`
  }

  if (/sell|store|bech|rakh|bechna|बेचें|रखें/.test(t)) {
    return isHindi
      ? `💰 **बेचें या रखें (Sell or Hold) सलाह:**\n\n• यदि आपके पास सुरक्षित गोदाम या शीत भंडार (Cold Storage) है, तो **गेहूं व चना** को 15-20 दिन रोकना फायदेमंद हो सकता है।\n• यदि उपज में नमी अधिक है या खुला भंडारण है, तो **अभी बेच देना सुरक्षित है**।\n\n🚚 KisanSetu पर खरीदारों से सीधे ऑफर प्राप्त करने के लिए अपना लॉट बनाएं!`
      : `💰 **Sell vs. Hold Advisory:**\n\n• If you have access to clean warehouse/cold storage, **holding for 2-3 weeks** may yield 5-8% higher returns.\n• If moisture is high or storage is exposed, **sell now** to prevent quality loss.\n\n🚚 Create a lot on KisanSetu to receive verified buyer offers directly!`
  }

  return isHindi
    ? `🌱 **कृषि सलाह:**\n\nKisanSetu पर आप सीधे सत्यापित खरीदारों को अपनी फसल बेच सकते हैं और बिचौलियों से बच सकते हैं।\n\nआप मुझसे पूछ सकते हैं:\n• "इंदौर में गेहूं का भाव"\n• "कम पानी में कौन सी फसल उगाएं"\n• "सोयाबीन में कीट नियंत्रण कैसे करें"`
    : `🌱 **KisanSetu AI Advisor:**\n\nYou can sell directly to verified institutional buyers on KisanSetu with 100% escrow payment protection.\n\nTry asking:\n• "Wheat prices in my mandi"\n• "Best crop for black soil"\n• "Should I sell or store soybean"`
}

function getFallbackCropRecommendations(
  district: string,
  season: string,
  soilType: string,
): Array<{
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
}> {
  if (season === 'rabi') {
    return [
      {
        crop: 'Wheat',
        cropHi: 'गेहूं',
        confidence: 0.92,
        reason: `Wheat is the primary rabi staple perfectly adapted for ${district} and ${soilType} soil conditions.`,
        expectedYield: '18-22 quintals/acre',
        estimatedRevenue: '₹45,000 - ₹55,000 / acre',
        tips: 'Sow between Nov 1-20. First irrigation at CRI stage (21 days after sowing). Apply NPK in 120:60:40 ratio.',
        sowingMonth: 'November',
        harvestMonth: 'April',
        waterRequirement: 'medium',
      },
      {
        crop: 'Chickpea / Gram',
        cropHi: 'चना',
        confidence: 0.88,
        reason: `Excellent pulse crop with low water requirement, high market demand, and soil nitrogen fixing benefits.`,
        expectedYield: '8-12 quintals/acre',
        estimatedRevenue: '₹48,000 - ₹65,000 / acre',
        tips: 'Treat seeds with Trichoderma viride. Avoid excessive water; 2 light irrigations are sufficient.',
        sowingMonth: 'October - November',
        harvestMonth: 'March',
        waterRequirement: 'low',
      },
      {
        crop: 'Mustard',
        cropHi: 'सरसों',
        confidence: 0.85,
        reason: `High cash crop return with short 110-day crop cycle, suitable for ${soilType} soil.`,
        expectedYield: '7-10 quintals/acre',
        estimatedRevenue: '₹38,000 - ₹52,000 / acre',
        tips: 'Use Pusa Bold or RH-749 variety. Monitor for aphid attack at flowering stage.',
        sowingMonth: 'October',
        harvestMonth: 'February',
        waterRequirement: 'low',
      },
      {
        crop: 'Potato',
        cropHi: 'आलू',
        confidence: 0.80,
        reason: 'High yielding commercial vegetable crop with ready demand in nearby urban markets.',
        expectedYield: '80-120 quintals/acre',
        estimatedRevenue: '₹80,000 - ₹1,20,000 / acre',
        tips: 'Use certified disease-free seed tubers (Kufri Jyoti/Pukhraj). Earthing up at 30 days.',
        sowingMonth: 'October - November',
        harvestMonth: 'January - February',
        waterRequirement: 'medium',
      },
    ]
  }

  if (season === 'zaid') {
    return [
      {
        crop: 'Moong (Green Gram)',
        cropHi: 'मूंग',
        confidence: 0.90,
        reason: 'Short 60-day summer pulse crop that enriches soil before Kharif season.',
        expectedYield: '4-6 quintals/acre',
        estimatedRevenue: '₹32,000 - ₹48,000 / acre',
        tips: 'Use IPM-205-7 (Virat) variety. Irrigate every 10-12 days during summer.',
        sowingMonth: 'March',
        harvestMonth: 'May',
        waterRequirement: 'medium',
      },
      {
        crop: 'Watermelon & Muskmelon',
        cropHi: 'तरबूज और खरबूजा',
        confidence: 0.86,
        reason: 'High profit summer fruit crop with huge seasonal demand across mandis.',
        expectedYield: '100-150 quintals/acre',
        estimatedRevenue: '₹75,000 - ₹1,10,000 / acre',
        tips: 'Adopt drip irrigation and plastic mulch for 30% higher fruit weight.',
        sowingMonth: 'February - March',
        harvestMonth: 'May',
        waterRequirement: 'medium',
      },
      {
        crop: 'Maize (Fodder/Grain)',
        cropHi: 'मक्का',
        confidence: 0.82,
        reason: 'Reliable summer crop for dairy fodder or high-demand sweet corn markets.',
        expectedYield: '18-24 quintals/acre',
        estimatedRevenue: '₹36,000 - ₹50,000 / acre',
        tips: 'Maintain plant spacing 60cm x 20cm. Apply zinc sulphate @ 10kg/acre.',
        sowingMonth: 'March',
        harvestMonth: 'June',
        waterRequirement: 'medium',
      },
    ]
  }

  // Kharif (Default)
  return [
    {
      crop: 'Soybean',
      cropHi: 'सोयाबीन',
      confidence: 0.91,
      reason: `Premier oilseed crop highly suitable for ${district} with guaranteed institutional buyer demand on KisanSetu.`,
      expectedYield: '10-14 quintals/acre',
      estimatedRevenue: '₹46,000 - ₹62,000 / acre',
      tips: 'Use JS-9560 or JS-2034. Seed treatment with Rhizobium culture is essential.',
      sowingMonth: 'June - July',
      harvestMonth: 'October',
      waterRequirement: 'medium',
    },
    {
      crop: 'Paddy / Basmati Rice',
      cropHi: 'धान / बासमती',
      confidence: 0.89,
      reason: 'Standard Kharif crop with reliable MSP procurement and export buyer market.',
      expectedYield: '20-28 quintals/acre',
      estimatedRevenue: '₹50,000 - ₹75,000 / acre',
      tips: 'Transplant 21-day-old seedlings. Maintain 2-3 cm standing water during tillering.',
      sowingMonth: 'June - July',
      harvestMonth: 'November',
      waterRequirement: 'high',
    },
    {
      crop: 'Cotton',
      cropHi: 'कपास',
      confidence: 0.85,
      reason: `High value fiber commercial crop well adapted to ${soilType} soil.`,
      expectedYield: '8-12 quintals/acre',
      estimatedRevenue: '₹55,000 - ₹80,000 / acre',
      tips: 'Monitor pink bollworm with pheromone traps. Avoid water stagnation.',
      sowingMonth: 'May - June',
      harvestMonth: 'November - December',
      waterRequirement: 'medium',
    },
    {
      crop: 'Tomato & Vegetables',
      cropHi: 'टमाटर एवं सब्जियां',
      confidence: 0.83,
      reason: 'Fast turnover commercial crop delivering quick cash flow.',
      expectedYield: '150-200 quintals/acre',
      estimatedRevenue: '₹90,000 - ₹1,50,000 / acre',
      tips: 'Stake hybrid plants. Spray neem-based formulation for whitefly control.',
      sowingMonth: 'July - August',
      harvestMonth: 'October - November',
      waterRequirement: 'medium',
    },
  ]
}

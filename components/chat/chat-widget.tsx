'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/lib/i18n'
import Image from 'next/image'
import { Send, X, Maximize2, Minimize2, Mic, MicOff, RotateCcw } from 'lucide-react'
import {
  getCurrentSeason,
  getRecommendedCrops,
  getCropTips,
  formatCropRecommendationMessage,
} from '@/lib/services/crop-advisor'
import { calculateTrend } from '@/lib/services/price-prediction'

/* ──────────────────────────────────────────
   Types
────────────────────────────────────────── */
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
}

type Intent =
  | 'greeting'
  | 'price_check'
  | 'crop_recommendation'
  | 'sell_or_store'
  | 'farming_tip'
  | 'soil_advice'
  | 'weather_season'
  | 'help'
  | 'unknown'

/* ──────────────────────────────────────────
   Intent detection
────────────────────────────────────────── */
const CROP_NAMES_EN = ['wheat', 'paddy', 'rice', 'cotton', 'soybean', 'soy', 'tomato', 'mustard', 'chickpea', 'gram', 'maize', 'corn']
const CROP_NAMES_HI = ['गेहूं', 'गेहूं', 'धान', 'कपास', 'सोयाबीन', 'टमाटर', 'सरसों', 'चना', 'मक्का']

function detectIntent(text: string): Intent {
  const t = text.toLowerCase()

  // Greetings
  if (/^(hi|hello|hey|namaste|नमस्ते|नमस्कार|हैलो|kem cho|namaskar)\b/.test(t)) return 'greeting'

  // Sell or store
  if (/\b(sell|store|hold|rakh|bech|bechna|store karna|रखें|बेचें|sell or hold|store karu|hold karu)\b/.test(t)) return 'sell_or_store'

  // Price check
  if (/\b(price|bhav|mandi|ভাব|rate|दाम|भाव|kya hai|today|aaj|current|market)\b/.test(t) ||
      CROP_NAMES_HI.some(c => t.includes(c)) && /\b(price|bhav|rate|दाम|भाव)\b/.test(t)) {
    return 'price_check'
  }

  // Crop recommendation
  if (/\b(grow|crop|plant|kya ugaen|kya lagaen|which crop|konsi fasal|konsa paudha|क्या उगाएं|फसल|suggest|recommendation|rabi|kharif|zaid)\b/.test(t)) return 'crop_recommendation'

  // Farming tips / pest
  if (/\b(tip|advice|pest|disease|fertilizer|irrigation|bimari|keeda|urvarak|sinchai|kheti|farming|sowing|harvest)\b/.test(t)) return 'farming_tip'

  // Soil
  if (/\b(soil|mitti|soil type|black soil|alluvial|red soil|sandy)\b/.test(t)) return 'soil_advice'

  // Weather / season
  if (/\b(weather|rain|monsoon|season|summer|winter|barsat|garmi|sardi|mausam|hava)\b/.test(t)) return 'weather_season'

  // Help
  if (/\b(help|kya kar sakte|what can you|kya puchhu)\b/.test(t)) return 'help'

  // If it mentions a crop name, treat as price_check
  if (CROP_NAMES_EN.some(c => t.includes(c))) return 'price_check'

  return 'unknown'
}

/* ──────────────────────────────────────────
   Response generators
────────────────────────────────────────── */
async function generateResponse(
  intent: Intent,
  userText: string,
  supabase: ReturnType<typeof createClient>,
  profile: { district?: string; language_pref?: string } | null,
): Promise<string> {
  const locale = (profile?.language_pref === 'hi' || userText.match(/[\u0900-\u097F]/)) ? 'hi' : 'en'
  const district = profile?.district || 'Indore'
  const now = new Date()
  const month = now.getMonth() + 1

  if (intent === 'greeting') {
    return locale === 'hi'
      ? `🙏 नमस्ते! मैं किसानसेतू AI सहायक हूँ।\n\nमैं आपकी मदद कर सकता हूँ:\n• 📈 किसी भी मंडी में फसल के भाव\n• 🌾 इस मौसम में क्या उगाएं\n• 💰 अभी बेचें या रखें\n• 🌤️ मौसम के सुझाव\n\nकोशिश करें: "इंदौर में गेहूं का भाव?" या "नवंबर में क्या उगाएं?"`
      : `🙏 Namaste! I'm the KisanSetu AI Assistant.\n\nI can help you with:\n• 📈 Crop prices in any mandi\n• 🌾 What to grow this season\n• 💰 Sell now vs store advice\n• 🌤️ Season & weather tips\n• 🐛 Pest & disease guidance\n\nTry: "Wheat price in Indore" or "What to grow in November?"`
  }

  if (intent === 'help') {
    return locale === 'hi'
      ? `ये चीजें पूछ सकते हैं:\n\n📈 **भाव**: "इंदौर में गेहूं का भाव"\n🌾 **फसल**: "नवंबर में क्या उगाएं"\n💰 **बेचें/रखें**: "गेहूं अभी बेचें या रखें"\n🌱 **सुझाव**: "सोयाबीन की खेती के सुझाव"\n🪱 **कीट**: "टमाटर में कीट से कैसे बचाएं"`
      : `Here's what you can ask:\n\n📈 **Prices**: "Wheat price in Indore"\n🌾 **Crops**: "What to grow in November"\n💰 **Sell/Store**: "Should I sell my wheat now"\n🌱 **Tips**: "Soybean farming tips"\n🪱 **Pests**: "How to control pests in cotton"\n🏷️ **Grades**: "What is Grade A produce"`
  }

  if (intent === 'crop_recommendation') {
    const recs = getRecommendedCrops(month, district, undefined, 3)
    return formatCropRecommendationMessage(recs, month, district, locale)
  }

  if (intent === 'farming_tip') {
    // Extract crop name from text
    const allCrops = [...CROP_NAMES_EN, ...CROP_NAMES_HI]
    const mentionedCrop = allCrops.find(c => userText.toLowerCase().includes(c.toLowerCase()))
    if (mentionedCrop) {
      const tips = getCropTips(mentionedCrop, locale)
      const cropName = mentionedCrop.charAt(0).toUpperCase() + mentionedCrop.slice(1)
      return locale === 'hi'
        ? `💡 **${cropName} की खेती के सुझाव:**\n\n${tips}\n\n🔗 लॉट बनाने के लिए KisanSetu पर जाएं।`
        : `💡 **${cropName} Farming Tips:**\n\n${tips}\n\n🔗 Visit the Lots section to list your produce on KisanSetu.`
    }
    return locale === 'hi'
      ? '🌱 किस फसल के बारे में सुझाव चाहिए? जैसे: "गेहूं की खेती के सुझाव" या "टमाटर में कीट से बचाव"'
      : '🌱 Which crop would you like tips for? E.g., "wheat farming tips" or "how to control pests in cotton"'
  }

  if (intent === 'soil_advice') {
    return locale === 'hi'
      ? `🪸 **मिट्टी के प्रकार और फसलें:**\n\n• **काली मिट्टी (Regur)**: गेहूं, कपास, सोयाबीन, चना\n• **जलोढ़ मिट्टी**: धान, गेहूं, मक्का, सब्जियां\n• **लाल मिट्टी**: मूंगफली, मक्का, बाजरा\n• **रेतीली मिट्टी**: मूंग, बाजरा, सरसों\n\nमिट्टी जांच के लिए अपने जिले के कृषि विज्ञान केंद्र (KVK) से संपर्क करें।`
      : `🪸 **Soil Types & Best Crops:**\n\n• **Black/Regur**: Wheat, Cotton, Soybean, Chickpea\n• **Alluvial**: Rice, Wheat, Maize, Vegetables\n• **Red Soil**: Groundnut, Maize, Millets\n• **Sandy/Loamy**: Mustard, Pulses, Millets\n\nGet your soil tested at your district KVK (Krishi Vigyan Kendra) for precise recommendations.`
  }

  if (intent === 'weather_season') {
    const season = getCurrentSeason(month)
    const seasonLabel = { kharif: 'Kharif (Jun-Nov)', rabi: 'Rabi (Oct-Apr)', zaid: 'Zaid (Mar-Jun)' }[season]
    const recs = getRecommendedCrops(month, district)
    const cropList = recs.map(r => r.cropSeason.crop).join(', ')

    return locale === 'hi'
      ? `🌤️ **वर्तमान मौसम: ${season === 'kharif' ? 'खरीफ' : season === 'rabi' ? 'रबी' : 'ज़ायद'} (${seasonLabel})**\n\n${district} में इस समय के लिए उपयुक्त फसलें: **${cropList}**\n\n💡 अभी बुवाई का सही समय है। किस फसल के बारे में अधिक जानना चाहते हैं?`
      : `🌤️ **Current Season: ${seasonLabel}**\n\nBest crops for ${district} right now: **${cropList}**\n\n💡 ${recs[0]?.isCurrentSowingWindow ? 'Now is a prime sowing window!' : 'Prepare for the upcoming sowing season.'} Which crop would you like to know more about?`
  }

  if (intent === 'sell_or_store') {
    // Fetch latest prices for mentioned/common crops
    const allCrops = CROP_NAMES_EN
    const mentionedCrop = allCrops.find(c => userText.toLowerCase().includes(c))
    const cropToCheck = mentionedCrop || 'wheat'

    try {
      const { data: prices } = await supabase
        .from('mandi_prices')
        .select('price_per_quintal, recorded_at')
        .ilike('crop', `%${cropToCheck}%`)
        .eq('district', district)
        .order('recorded_at', { ascending: false })
        .limit(14)

      if (prices && prices.length >= 5) {
        const priceValues = prices.map(p => p.price_per_quintal)
        const trend = calculateTrend(priceValues)
        const latestPrice = priceValues[0]

        if (trend === 'rising') {
          return locale === 'hi'
            ? `📈 **${cropToCheck.charAt(0).toUpperCase() + cropToCheck.slice(1)} का भाव बढ़ रहा है!**\n\n${district} में वर्तमान भाव: **₹${latestPrice}/क्विंटल**\nरुझान: ⬆️ बढ़ रहा है\n\n💡 **सलाह: रखें** — अगले 3-5 दिन में भाव और बढ़ सकते हैं।\n\n⚠️ अगर पास में शीत भंडार नहीं है, तो 2 दिन के भीतर बेचें।`
            : `📈 **${cropToCheck.charAt(0).toUpperCase() + cropToCheck.slice(1)} prices are RISING!**\n\nCurrent price in ${district}: **₹${latestPrice}/quintal**\nTrend: ⬆️ Rising\n\n💡 **Advice: HOLD** — prices may rise further in the next 3-5 days.\n\n⚠️ If no cold storage nearby, sell within 2 days to avoid quality loss.`
        } else if (trend === 'falling') {
          return locale === 'hi'
            ? `📉 **${cropToCheck} का भाव घट रहा है।**\n\n${district} में वर्तमान भाव: **₹${latestPrice}/क्विंटल**\nरुझान: ⬇️ घट रहा है\n\n💡 **सलाह: अभी बेचें** — और प्रतीक्षा करने से नुकसान हो सकता है।`
            : `📉 **${cropToCheck.charAt(0).toUpperCase() + cropToCheck.slice(1)} prices are FALLING.**\n\nCurrent price in ${district}: **₹${latestPrice}/quintal**\nTrend: ⬇️ Falling\n\n💡 **Advice: SELL NOW** — waiting may cost you more.`
        } else {
          return locale === 'hi'
            ? `📊 **${cropToCheck} का भाव स्थिर है।**\n\n${district} में वर्तमान भाव: **₹${latestPrice}/क्विंटल**\nरुझान: → स्थिर\n\n💡 अगर आपको तुरंत पैसों की जरूरत नहीं है, थोड़ा और इंतजार करें। अगर करना है तो अभी बेचें।`
            : `📊 **${cropToCheck.charAt(0).toUpperCase() + cropToCheck.slice(1)} prices are STABLE.**\n\nCurrent price in ${district}: **₹${latestPrice}/quintal**\nTrend: → Stable\n\n💡 If not pressed for cash, hold for a few days and monitor. Otherwise, selling now is safe.`
        }
      }
    } catch { /* ignore */ }

    return locale === 'hi'
      ? `💡 ${district} में इस समय भाव डेटा उपलब्ध नहीं है। KisanSetu पर भाव पेज देखें या अपने जिले की APMC मंडी से पूछें।`
      : `💡 No recent price data available for ${district}. Check the Prices page on KisanSetu or contact your local APMC mandi.`
  }

  if (intent === 'price_check') {
    // Extract crop and district from text
    const allCrops = CROP_NAMES_EN
    const mentionedCrop = allCrops.find(c => userText.toLowerCase().includes(c.toLowerCase()))
    const cropToCheck = mentionedCrop || 'wheat'

    try {
      const { data: prices } = await supabase
        .from('mandi_prices')
        .select('price_per_quintal, district, recorded_at')
        .ilike('crop', `%${cropToCheck}%`)
        .order('recorded_at', { ascending: false })
        .limit(5)

      if (prices && prices.length > 0) {
        const trend = calculateTrend(prices.map(p => p.price_per_quintal))
        const trendEmoji = { rising: '⬆️', falling: '⬇️', stable: '→' }[trend]
        const trendLabel = { rising: 'Rising', falling: 'Falling', stable: 'Stable' }[trend]

        const rows = prices.slice(0, 5).map(p =>
          `• ${p.district}: ₹${p.price_per_quintal}/q`
        ).join('\n')

        return locale === 'hi'
          ? `📈 **${cropToCheck.charAt(0).toUpperCase() + cropToCheck.slice(1)} के आज के भाव:**\n\n${rows}\n\nरुझान: ${trendEmoji} ${trendLabel === 'Rising' ? 'बढ़ रहा है' : trendLabel === 'Falling' ? 'घट रहा है' : 'स्थिर'}\n\n💡 7-दिन के पूर्वानुमान के लिए KisanSetu पर भाव पेज देखें।`
          : `📈 **Today's ${cropToCheck.charAt(0).toUpperCase() + cropToCheck.slice(1)} Prices:**\n\n${rows}\n\nTrend: ${trendEmoji} ${trendLabel}\n\n💡 Visit the Prices page for a 7-day forecast chart.`
      }
    } catch { /* ignore */ }

    return locale === 'hi'
      ? `भाव की जानकारी अभी उपलब्ध नहीं है। KisanSetu पर **भाव** पेज देखें।`
      : `No price data currently available for that crop. Check the **Prices** page on KisanSetu.`
  }

  // Unknown fallback
  return locale === 'hi'
    ? `🤔 मैं पूरी तरह समझ नहीं पाया। कृपया इस तरह पूछें:\n• "इंदौर में गेहूं का भाव"\n• "नवंबर में क्या उगाएं"\n• "गेहूं बेचूं या रखूं"`
    : `🤔 I couldn't understand that fully. Try asking:\n• "Wheat price in Indore"\n• "What to grow in November"\n• "Should I sell my cotton now"\n\nOr click a quick reply below!`
}

/* ──────────────────────────────────────────
   Chat Widget Component
────────────────────────────────────────── */
export function ChatWidget() {
  const { t, locale } = useTranslation()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [profile, setProfile] = useState<{ district?: string; language_pref?: string } | null>(null)

  // Load profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('profiles').select('district, language_pref').eq('id', data.user.id).single()
          .then(({ data: p }) => { if (p) setProfile(p) })
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kisansetu_chat')
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[]
        setMessages(parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) })))
      } else {
        // First-time greeting
        setMessages([{
          id: 'init',
          role: 'assistant',
          text: t('chat.greeting'),
          timestamp: new Date(),
        }])
      }
    } catch {
      setMessages([{
        id: 'init',
        role: 'assistant',
        text: t('chat.greeting'),
        timestamp: new Date(),
      }])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist messages
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem('kisansetu_chat', JSON.stringify(messages.slice(-50))) } catch { /* ignore */ }
    }
  }, [messages])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')
    setLoading(true)

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])

    let responseText = ''

    // Try real Gemini AI first
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          context: {
            district: profile?.district,
            language: profile?.language_pref ?? (text.match(/[\u0900-\u097F]/) ? 'hi' : 'en'),
          },
        }),
      })
      const data = await res.json()
      if (res.ok && data.reply) {
        responseText = data.reply
      } else {
        throw new Error(data.error || 'AI unavailable')
      }
    } catch {
      // Fallback to local intent-based response
      const intent = detectIntent(text)
      responseText = await generateResponse(intent, text, supabase, profile)
    }

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: responseText,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, aiMsg])
    setLoading(false)
  }, [loading, profile, supabase])

  // Voice input
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser. Try Chrome.')
      return
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = locale === 'hi' ? 'hi-IN' : 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [locale])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const clearHistory = useCallback(() => {
    const initMsg: ChatMessage = {
      id: 'init-' + Date.now(),
      role: 'assistant',
      text: t('chat.greeting'),
      timestamp: new Date(),
    }
    setMessages([initMsg])
    try { localStorage.removeItem('kisansetu_chat') } catch { /* ignore */ }
  }, [t])

  const quickReplies = [
    t('chat.chip.prices'),
    t('chat.chip.grow'),
    t('chat.chip.sellStore'),
    t('chat.chip.season'),
  ]

  const chipToQuery: Record<string, string> = {
    [t('chat.chip.prices')]: locale === 'hi' ? 'आज का मंडी भाव क्या है?' : 'What are today\'s mandi prices?',
    [t('chat.chip.grow')]: locale === 'hi' ? 'इस मौसम में क्या उगाएं?' : 'What crops should I grow this season?',
    [t('chat.chip.sellStore')]: locale === 'hi' ? 'क्या अभी बेचना चाहिए या रखना चाहिए?' : 'Should I sell my produce now or store it?',
    [t('chat.chip.season')]: locale === 'hi' ? 'इस मौसम के लिए खेती के सुझाव दें' : 'Give me season farming tips',
  }

  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: formatted }} />
          {i < text.split('\n').length - 1 && <br />}
        </span>
      )
    })
  }

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          id="chat-widget-open"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#1B5E20] hover:bg-[#2D7D32] text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 group"
          aria-label="Open KisanSetu AI Chat"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform">🌾</span>
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full ring-2 ring-[#1B5E20]/40 animate-ping" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          id="chat-widget-panel"
          className={`fixed z-50 flex flex-col bg-white shadow-2xl rounded-2xl border border-gray-100 transition-all duration-300
            ${expanded
              ? 'inset-4 md:inset-8'
              : 'bottom-6 right-6 w-[360px] h-[560px]'
            }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B5E20] to-[#2D7D32] rounded-t-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#F9A825] shadow-md shrink-0">
              <Image src="/kisansetu-logo.png" alt="KisanSetu AI" width={40} height={40} className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">{t('chat.title')}</p>
              <p className="text-green-200 text-xs truncate">{t('chat.subtitle')}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearHistory} title="Clear history"
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <RotateCcw className="w-3.5 h-3.5 text-green-200" />
              </button>
              <button onClick={() => setExpanded(v => !v)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors hidden sm:block">
                {expanded ? <Minimize2 className="w-3.5 h-3.5 text-green-200" /> : <Maximize2 className="w-3.5 h-3.5 text-green-200" />}
              </button>
              <button id="chat-widget-close" onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F9FBF9]">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[#1B5E20] flex items-center justify-center text-xs mr-2 shrink-0 mt-1">🌾</div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm
                  ${msg.role === 'user'
                    ? 'bg-[#2D7D32] text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                  }`}
                >
                  {formatText(msg.text)}
                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-green-200' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-[#1B5E20] flex items-center justify-center text-xs mr-2 shrink-0">🌾</div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-gray-100 bg-white">
              {quickReplies.map(chip => (
                <button key={chip}
                  onClick={() => sendMessage(chipToQuery[chip] ?? chip)}
                  className="text-xs bg-[#F1F8E9] border border-green-200 text-green-800 px-2.5 py-1.5 rounded-full hover:bg-green-100 transition-colors font-medium">
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-gray-100 bg-white rounded-b-2xl">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-[#2D7D32] focus-within:ring-1 focus-within:ring-[#2D7D32] transition-all px-3">
              <input
                ref={inputRef}
                id="chat-input"
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
                placeholder={t('chat.placeholder')}
                className="flex-1 bg-transparent py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                disabled={loading}
              />
              <button
                onClick={listening ? stopListening : startListening}
                className={`p-1.5 rounded-lg transition-colors ${listening ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-green-700'}`}
                title={listening ? 'Stop listening' : 'Voice input'}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                id="chat-send"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="p-1.5 bg-[#2D7D32] hover:bg-[#1B5E20] text-white rounded-lg disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

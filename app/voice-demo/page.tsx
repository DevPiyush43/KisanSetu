'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { useTranslation } from '@/lib/i18n'
import { Phone, PhoneOff, Mic, Volume2 } from 'lucide-react'

/* ── Mock voice IVR script ── */
const IVR_SCRIPT: { ai: string; wait: number }[] = [
  { ai: '🙏 नमस्ते! KisanSetu प्राइस हेल्पलाइन में आपका स्वागत है।\n\nकिस फसल का भाव जानना चाहते हैं?\n1 — गेहूं\n2 — सोयाबीन\n3 — कपास\n4 — टमाटर\n\nया बोलिए "गेहूं भाव इंदौर"', wait: 3000 },
  { ai: '📊 इंदौर मंडी में गेहूं का आज का भाव:\n\n₹2,340 प्रति क्विंटल\n\nकल से ₹15 ज़्यादा (+0.6%)\n\nAI सलाह: 📈 भाव बढ़ रहा है।\n3-5 दिन रखें, अगर भंडारण उपलब्ध है।\n\nक्या आप और कोई फसल जानना चाहते हैं?', wait: 4000 },
  { ai: '📊 भोपाल मंडी में सोयाबीन का भाव:\n\n₹4,120 प्रति क्विंटल\n\nकल से ₹45 कम (-1.1%)\n\nAI सलाह: ⚠️ भाव गिर रहा है।\nअभी बेचना फायदेमंद होगा।\n\nक्या आप KisanSetu पर लॉट बनाना चाहते हैं?\n1 — हाँ\n2 — नहीं', wait: 4000 },
  { ai: '✅ बहुत अच्छा! अपना फ़ोन देखें — KisanSetu एप पर "लॉट बनाएं" पेज खुलेगा।\n\nधन्यवाद! KisanSetu प्राइस हेल्पलाइन — अपने भाव जानें, सही फैसला लें। 🌾', wait: 3000 },
]

const USER_RESPONSES = [
  '🎤 "गेहूं भाव इंदौर"',
  '🎤 "सोयाबीन भाव भोपाल"',
  '🎤 "हाँ, लॉट बनाओ"',
]

export default function VoiceDemoPage() {
  const supabase = createClient()
  const { t } = useTranslation()
  const [profile, setProfile] = useState<any>(null)
  const [callActive, setCallActive] = useState(false)
  const [, setCallStep] = useState(-1)
  const [transcript, setTranscript] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([])
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [userSpeaking, setUserSpeaking] = useState(false)
  const [timer, setTimer] = useState(0)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll transcript
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' })
  }, [transcript])

  const advanceScript = useCallback(async (step: number) => {
    if (step >= IVR_SCRIPT.length) {
      // End call
      setTimeout(() => {
        setCallActive(false)
        if (timerRef.current) clearInterval(timerRef.current)
      }, 2000)
      return
    }

    // AI speaks
    setAiSpeaking(true)
    setUserSpeaking(false)
    await new Promise(r => setTimeout(r, 800))
    setTranscript(prev => [...prev, { role: 'ai', text: IVR_SCRIPT[step].ai }])
    setAiSpeaking(false)

    // Wait, then simulate user response
    if (step < USER_RESPONSES.length) {
      await new Promise(r => setTimeout(r, IVR_SCRIPT[step].wait))
      setUserSpeaking(true)
      await new Promise(r => setTimeout(r, 1200))
      setTranscript(prev => [...prev, { role: 'user', text: USER_RESPONSES[step] }])
      setUserSpeaking(false)
      setCallStep(step + 1)
      // Auto-advance
      await new Promise(r => setTimeout(r, 500))
      advanceScript(step + 1)
    }
  }, [])

  const startCall = useCallback(() => {
    setCallActive(true)
    setCallStep(0)
    setTranscript([])
    setTimer(0)

    // Timer
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)

    // Start script
    setTimeout(() => advanceScript(0), 1500)
  }, [advanceScript])

  const endCall = useCallback(() => {
    setCallActive(false)
    setAiSpeaking(false)
    setUserSpeaking(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">🎙️ {t('voice.title')}</h1>
          <p className="text-sm text-gray-500">{t('voice.subtitle')}</p>
        </div>

        {/* Phone UI */}
        <div className="bg-gradient-to-b from-[#1B5E20] to-[#0D3311] rounded-3xl p-6 shadow-2xl max-w-sm mx-auto">
          {/* Call status */}
          <div className="text-center mb-6">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 transition-all ${
              callActive
                ? aiSpeaking ? 'bg-green-400/30 ring-4 ring-green-400/50 animate-pulse' : 'bg-white/10'
                : 'bg-white/10'
            }`}>
              {callActive ? (
                aiSpeaking ? <Volume2 className="w-10 h-10 text-green-300" />
                : userSpeaking ? <Mic className="w-10 h-10 text-[#F9A825]" />
                : <Phone className="w-10 h-10 text-green-300" />
              ) : (
                <Phone className="w-10 h-10 text-green-300" />
              )}
            </div>
            <p className="text-white font-bold text-lg">
              {callActive ? 'KisanSetu AI हेल्पलाइन' : t('voice.callNow')}
            </p>
            <p className="text-green-200 text-sm">
              {callActive ? (
                aiSpeaking ? t('voice.speaking') : userSpeaking ? t('voice.listening') : formatTime(timer)
              ) : (
                '1800-XXX-XXXX (Toll Free)'
              )}
            </p>
            {callActive && (
              <p className="text-green-300/60 text-xs mt-1">{formatTime(timer)}</p>
            )}
          </div>

          {/* Transcript */}
          {callActive && (
            <div ref={transcriptRef}
              className="bg-black/30 rounded-2xl p-4 mb-4 max-h-64 overflow-y-auto space-y-3 scroll-smooth">
              {transcript.length === 0 && (
                <p className="text-green-200/50 text-sm text-center">📞 Connecting...</p>
              )}
              {transcript.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-[#F9A825] text-[#1B5E20] rounded-tr-sm'
                      : 'bg-white/10 text-green-100 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {(aiSpeaking || userSpeaking) && (
                <div className={`flex ${userSpeaking ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-2xl px-4 py-2 ${userSpeaking ? 'bg-[#F9A825]/50' : 'bg-white/5'}`}>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Call buttons */}
          <div className="flex justify-center gap-4">
            {!callActive ? (
              <button onClick={startCall}
                className="w-16 h-16 bg-green-500 hover:bg-green-400 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110">
                <Phone className="w-7 h-7" />
              </button>
            ) : (
              <button onClick={endCall}
                className="w-16 h-16 bg-red-500 hover:bg-red-400 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110">
                <PhoneOff className="w-7 h-7" />
              </button>
            )}
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-8 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">How it works</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-3 items-start">
              <span className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700 shrink-0">1</span>
              <p>Farmer calls the KisanSetu toll-free number from any phone (no internet needed).</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700 shrink-0">2</span>
              <p>AI voice assistant responds in Hindi/regional language. Farmer speaks their query naturally.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700 shrink-0">3</span>
              <p>System fetches real-time mandi prices from the KisanSetu database and gives sell/hold advice.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700 shrink-0">4</span>
              <p>Farmer can create a lot listing via voice, which auto-populates in the KisanSetu app.</p>
            </div>
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
            ℹ️ This is a <strong>simulated demo</strong> of the voice IVR experience. In production, this would use Twilio/Exotel voice APIs with Whisper STT + TTS.
          </div>
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}

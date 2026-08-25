'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Mic, Leaf, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface Message {
  id: number
  role: 'user' | 'bot'
  text: string
  timestamp: Date
}

const CROPS = ['Wheat', 'Paddy', 'Cotton', 'Soybean', 'Tomato']
const DISTRICTS = ['Indore', 'Bhopal', 'Nagpur', 'Pune', 'Jaipur']

function detectCropAndDistrict(query: string): { crop: string | null; district: string | null } {
  const q = query.toLowerCase()
  const crop = CROPS.find(c => q.includes(c.toLowerCase())) ?? null
  const district = DISTRICTS.find(d => q.includes(d.toLowerCase())) ?? null
  return { crop, district }
}

const CROP_HINDI: Record<string, string> = {
  Wheat: 'गेहूँ', Paddy: 'धान', Cotton: 'कपास', Soybean: 'सोयाबीन', Tomato: 'टमाटर'
}

const GREETINGS = ['hi', 'hello', 'hey', 'namaste', 'नमस्ते', 'हेलो']
const HELP_KEYWORDS = ['help', 'मदद', 'kya', 'क्या', 'what can']

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0, role: 'bot', timestamp: new Date(),
      text: '🌾 नमस्ते! I\'m the KisanSetu Assistant.\n\nAsk me about crop prices! Examples:\n• "Wheat price in Indore"\n• "Cotton rate Nagpur"\n• "Tomato Pune price today"'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleQuery(query: string) {
    const q = query.trim()
    if (!q) return

    const userMsg: Message = { id: Date.now(), role: 'user', text: q, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    let response = ''

    // Greetings
    if (GREETINGS.some(g => q.toLowerCase() === g)) {
      response = '🙏 Namaste! Ask me about today\'s mandi prices.\nExample: "Wheat price Indore"'
    }
    // Help
    else if (HELP_KEYWORDS.some(k => q.toLowerCase().includes(k))) {
      response = '📋 I can help with:\n• Crop prices in any mandi\n• Today\'s rates for Wheat, Paddy, Cotton, Soybean, Tomato\n• Markets: Indore, Bhopal, Nagpur, Pune, Jaipur\n\nJust ask: "[Crop] price in [City]"'
    }
    else {
      const { crop, district } = detectCropAndDistrict(q)

      if (!crop && !district) {
        response = '🤔 I didn\'t understand that. Try asking:\n"Wheat price in Indore" or "Cotton rate Nagpur"'
      } else if (!crop) {
        response = `📍 Which crop price in ${district}? I know about Wheat, Paddy, Cotton, Soybean, Tomato.`
      } else if (!district) {
        response = `🌾 Which market? I cover Indore, Bhopal, Nagpur, Pune, Jaipur.\nTry: "${crop} price Indore"`
      } else {
        // Fetch from Supabase
        const { data } = await supabase
          .from('mandi_prices')
          .select('price_per_quintal, recorded_on')
          .eq('crop', crop)
          .eq('district', district)
          .order('recorded_on', { ascending: false })
          .limit(2)

        if (data && data.length > 0) {
          const today = data[0]
          const prev = data[1]
          const trend = prev ? (today.price_per_quintal > prev.price_per_quintal ? '📈' : '📉') : '➡️'
          const hindiCrop = CROP_HINDI[crop] ?? crop
          response = `${trend} ${crop} (${hindiCrop}) in ${district} Mandi:\n\n💰 Today: ${formatCurrency(today.price_per_quintal)}/quintal\n📅 Date: ${new Date(today.recorded_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}\n\n💡 Use Price Discovery for 14-day charts!`
        } else {
          response = `📊 No price data found for ${crop} in ${district}. Please check the Price Discovery page for more options.`
        }
      }
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', text: response, timestamp: new Date() }])
      setLoading(false)
    }, 500)
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform ${open ? 'hidden' : 'flex'}`}
      >
        <MessageSquare className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F9A825] rounded-full text-[10px] font-bold text-white flex items-center justify-center">!</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 h-[480px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-[#25D366] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Leaf className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">KisanSetu Assistant</p>
                <p className="text-xs text-green-100">WhatsApp Bot Preview • Phase 2</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#ECE5DD]">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-line shadow-sm
                  ${msg.role === 'user'
                    ? 'bg-[#DCF8C6] text-gray-800 rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm'}`}>
                  {msg.text}
                  <p className="text-[10px] text-gray-400 mt-1 text-right">
                    {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-2 rounded-2xl rounded-bl-sm shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 bg-[#F0F0F0] border-t border-gray-200">
            <div className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-sm">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuery(input)}
                placeholder="Ask about crop prices..."
                className="flex-1 text-sm outline-none bg-transparent"
              />
              <button
                onClick={() => handleQuery(input)}
                disabled={!input.trim() || loading}
                className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-[#20C157] transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
            {/* TODO(phase-2): Add real voice input via Web Speech API */}
          </div>
        </div>
      )}
    </>
  )
}

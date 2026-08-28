'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { LocationSelector } from '@/components/ui/location-selector'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Sparkles, Droplets, Sun, Cloud, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CropRec {
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
}

const SEASONS = [
  { value: 'kharif', label: 'Kharif (Jun-Nov)', labelHi: 'खरीफ (जून-नवम्बर)', icon: '🌧️' },
  { value: 'rabi', label: 'Rabi (Oct-Apr)', labelHi: 'रबी (अक्टू-अप्रैल)', icon: '❄️' },
  { value: 'zaid', label: 'Zaid (Mar-Jun)', labelHi: 'ज़ायद (मार्च-जून)', icon: '☀️' },
]

const SOIL_TYPES = [
  { value: 'alluvial', label: 'Alluvial (जलोढ़)', icon: '🏔️' },
  { value: 'black', label: 'Black/Regur (काली)', icon: '🟤' },
  { value: 'red', label: 'Red (लाल)', icon: '🔴' },
  { value: 'laterite', label: 'Laterite (लेटेराइट)', icon: '🟠' },
  { value: 'sandy', label: 'Sandy/Loamy (रेतीली)', icon: '🏖️' },
  { value: 'clayey', label: 'Clayey (चिकनी)', icon: '🪨' },
]

const WATER_OPTIONS = [
  { value: 'rainfed', label: 'Rainfed Only (वर्षा आधारित)', icon: <Cloud className="w-4 h-4" /> },
  { value: 'canal', label: 'Canal / River (नहर/नदी)', icon: <Droplets className="w-4 h-4" /> },
  { value: 'tubewell', label: 'Tubewell / Borewell (ट्यूबवेल)', icon: <Droplets className="w-4 h-4" /> },
  { value: 'abundant', label: 'Abundant (प्रचुर)', icon: <Droplets className="w-4 h-4" /> },
]

export default function CropRecommendPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [state, setState] = useState('')
  const [district, setDistrict] = useState('')
  const [season, setSeason] = useState('')
  const [soilType, setSoilType] = useState('')
  const [waterAvailability, setWaterAvailability] = useState('')
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<CropRec[]>([])
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null)

  // Load profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('profiles').select('*').eq('id', data.user.id).single()
          .then(({ data: p }) => { if (p) setProfile(p) })
      }
    })
  }, [])

  const handleRecommend = async () => {
    if (!district || !season) {
      toast.error('Please select your district and season')
      return
    }

    setLoading(true)
    setRecommendations([])

    try {
      const res = await fetch('/api/crop-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state,
          district,
          season,
          soilType: soilType || 'alluvial',
          waterAvailability: waterAvailability || 'medium',
        }),
      })

      const data = await res.json()

      if (res.ok && data.recommendations) {
        setRecommendations(data.recommendations)
        toast.success(`Found ${data.recommendations.length} crop recommendations!`)
      } else {
        throw new Error(data.error || 'Failed to get recommendations')
      }
    } catch (err: any) {
      toast.error(err.message || 'AI service unavailable. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  const waterIcon = (level: string) => {
    if (level === 'low') return '💧'
    if (level === 'medium') return '💧💧'
    return '💧💧💧'
  }

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#2D7D32] to-[#388E3C] text-white px-5 py-2 rounded-full text-sm font-semibold mb-3 shadow-md">
            <Sparkles className="w-4 h-4" />
            AI-Powered Crop Advisor
          </div>
          <h1 className="text-3xl font-bold text-gray-800">What Should You Grow?</h1>
          <p className="text-gray-500 text-sm mt-1">Get AI-powered crop recommendations based on your location, season, and soil</p>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location */}
            <div className="md:col-span-2">
              <LocationSelector
                selectedState={state}
                selectedDistrict={district}
                onStateChange={s => { setState(s); setDistrict('') }}
                onDistrictChange={setDistrict}
                required
              />
            </div>

            {/* Season */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                <Sun className="w-4 h-4 text-amber-500" /> Season *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SEASONS.map(s => (
                  <button key={s.value} type="button" onClick={() => setSeason(s.value)}
                    className={`flex flex-col items-center py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                      season === s.value
                        ? 'border-[#2D7D32] bg-[#F1F8E9] text-[#2D7D32]'
                        : 'border-gray-200 hover:border-green-300 text-gray-600'
                    }`}>
                    <span className="text-lg mb-1">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Soil Type */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                <Leaf className="w-4 h-4 text-[#2D7D32]" /> Soil Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SOIL_TYPES.map(s => (
                  <button key={s.value} type="button" onClick={() => setSoilType(s.value)}
                    className={`flex flex-col items-center py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                      soilType === s.value
                        ? 'border-[#2D7D32] bg-[#F1F8E9] text-[#2D7D32]'
                        : 'border-gray-200 hover:border-green-300 text-gray-600'
                    }`}>
                    <span className="text-sm">{s.icon}</span>
                    <span className="mt-0.5 text-center leading-tight">{s.label.split(' (')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Water */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                <Droplets className="w-4 h-4 text-blue-500" /> Water Availability
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WATER_OPTIONS.map(w => (
                  <button key={w.value} type="button" onClick={() => setWaterAvailability(w.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                      waterAvailability === w.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300 text-gray-600'
                    }`}>
                    {w.icon}
                    {w.label.split(' (')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleRecommend}
            disabled={loading || !district || !season}
            className="w-full mt-6 bg-gradient-to-r from-[#2D7D32] to-[#388E3C] hover:from-[#1B5E20] hover:to-[#2D7D32] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> AI is analyzing...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Get AI Crop Recommendations</>
            )}
          </button>
        </div>

        {/* Results */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Recommended Crops for {district}, {state}
            </h2>

            {recommendations.map((rec, idx) => (
              <div key={rec.crop} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setExpandedCrop(expandedCrop === rec.crop ? null : rec.crop)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : 'bg-amber-700'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-800">{rec.crop} <span className="text-gray-400 font-normal">({rec.cropHi})</span></h3>
                      <p className="text-xs text-gray-500">{rec.reason?.slice(0, 80)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400">Confidence</p>
                      <div className="flex items-center gap-1">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-[#2D7D32] h-1.5 rounded-full" style={{ width: `${(rec.confidence ?? 0.7) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-[#2D7D32]">{Math.round((rec.confidence ?? 0.7) * 100)}%</span>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedCrop === rec.crop ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {expandedCrop === rec.crop && (
                  <div className="px-6 pb-5 border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {[
                        ['📅 Sowing', rec.sowingMonth ?? '—'],
                        ['🌾 Harvest', rec.harvestMonth ?? '—'],
                        ['📊 Yield', rec.expectedYield ?? '—'],
                        [waterIcon(rec.waterRequirement ?? 'medium') + ' Water', rec.waterRequirement ?? '—'],
                      ].map(([label, value]) => (
                        <div key={label as string} className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-green-50 rounded-xl p-4 mb-3">
                      <p className="text-sm text-gray-700"><strong>💰 Estimated Revenue:</strong> {rec.estimatedRevenue ?? '—'}</p>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>

                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-blue-700 mb-1">💡 Growing Tips</p>
                      <p className="text-sm text-blue-800">{rec.tips}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <ChatWidget />
    </div>
  )
}

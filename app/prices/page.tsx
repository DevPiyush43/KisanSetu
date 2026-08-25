'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { MandiPrice, ForecastResult, CROPS, DISTRICTS } from '@/lib/types'
import { formatCurrency, formatDateShort, cropEmoji } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, RefreshCw, Brain } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const CHART_COLORS: Record<string, string> = {
  Indore: '#2D7D32', Bhopal: '#1976D2', Nagpur: '#F57C00', Pune: '#7B1FA2', Jaipur: '#C62828'
}

export default function PricesPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [prices, setPrices] = useState<MandiPrice[]>([])
  const [selectedCrop, setSelectedCrop] = useState('Wheat')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [advisory, setAdvisory] = useState<ForecastResult | null>(null)
  const [advisoryLoading, setAdvisoryLoading] = useState(false)
  const [summary, setSummary] = useState({ max: 0, min: 0, avg: 0, trend: 0 })

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
        if (data?.primary_crops?.[0]) setSelectedCrop(data.primary_crops[0])
        if (data?.district) setSelectedDistrict(data.district)
      }
    })
  }, [])

  const fetchPrices = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('mandi_prices')
      .select('*')
      .eq('crop', selectedCrop)
      .order('recorded_on', { ascending: false })
      .limit(100)

    if (selectedDistrict) query = query.eq('district', selectedDistrict)

    const { data } = await query
    setPrices(data ?? [])

    // Build chart data (last 14 days, one row per date, columns per district)
    const byDate: Record<string, Record<string, number>> = {}
    for (const p of (data ?? [])) {
      if (!byDate[p.recorded_on]) byDate[p.recorded_on] = {}
      byDate[p.recorded_on][p.district] = p.price_per_quintal
    }
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14)
    setChartData(sorted.map(([date, vals]) => ({ date: formatDateShort(date), ...vals })))

    // Summary stats for selected district or all
    const relevant = (data ?? []).filter(p => !selectedDistrict || p.district === selectedDistrict)
    if (relevant.length > 0) {
      const vals = relevant.map(p => p.price_per_quintal)
      const latestTwo = relevant.slice(0, 2)
      const trend = latestTwo.length >= 2 ? latestTwo[0].price_per_quintal - latestTwo[1].price_per_quintal : 0
      setSummary({
        max: Math.max(...vals),
        min: Math.min(...vals),
        avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        trend,
      })
    }
    setLoading(false)
  }, [selectedCrop, selectedDistrict])

  useEffect(() => { fetchPrices() }, [fetchPrices])

  const fetchAdvisory = async () => {
    setAdvisoryLoading(true)
    const prices14 = chartData.map(d => {
      const val = selectedDistrict ? d[selectedDistrict] : Object.values(d).find(v => typeof v === 'number')
      return typeof val === 'number' ? val : null
    }).filter(Boolean) as number[]

    if (prices14.length < 3) { setAdvisoryLoading(false); return }
    const res = await fetch('/api/forecast-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop: selectedCrop, mandi: selectedDistrict || 'All', prices: prices14 }),
    })
    if (res.ok) setAdvisory(await res.json())
    setAdvisoryLoading(false)
  }

  useEffect(() => { if (chartData.length >= 3) fetchAdvisory() }, [chartData, selectedCrop, selectedDistrict])

  // Latest prices per mandi for the table
  const latestPerMandi: MandiPrice[] = []
  const seenMandi = new Set<string>()
  for (const p of prices) {
    if (!seenMandi.has(p.mandi)) { seenMandi.add(p.mandi); latestPerMandi.push(p) }
  }

  const activeDistricts = selectedDistrict ? [selectedDistrict] : DISTRICTS

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">📊 Price Discovery</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select value={selectedCrop} onChange={e => setSelectedCrop(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D7D32] shadow-sm">
            {CROPS.map(c => <option key={c} value={c}>{cropEmoji(c)} {c}</option>)}
          </select>
          <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D7D32] shadow-sm">
            <option value="">All Mandis</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={fetchPrices}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Highest', value: summary.max, color: 'text-green-600' },
            { label: 'Lowest', value: summary.min, color: 'text-red-500' },
            { label: 'Average', value: summary.avg, color: 'text-blue-600' },
            { label: 'Today vs Yesterday', value: summary.trend, color: summary.trend >= 0 ? 'text-green-600' : 'text-red-500', isChange: true },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className={`text-lg font-bold ${card.color}`}>
                {card.isChange
                  ? <span className="flex items-center gap-1">
                      {summary.trend > 0 ? <TrendingUp className="w-4 h-4" /> : summary.trend < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      {summary.trend > 0 ? '+' : ''}{formatCurrency(summary.trend)}
                    </span>
                  : card.value > 0 ? formatCurrency(card.value) : '—'
                }
              </p>
              <p className="text-xs text-gray-400">per quintal</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">14-Day Price Trend — {cropEmoji(selectedCrop)} {selectedCrop}</h2>
            {loading ? (
              <div className="h-56 flex items-center justify-center text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-[#2D7D32] rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(1)}k`} width={55} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  {activeDistricts.filter(d => chartData.some(row => row[d])).map(d => (
                    <Line key={d} type="monotone" dataKey={d} stroke={CHART_COLORS[d] ?? '#2D7D32'}
                      strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* AI Advisory */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-[#2D7D32]" />
              <h2 className="font-semibold text-gray-800">AI Advisory</h2>
            </div>
            {advisoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-[#2D7D32] rounded-full animate-spin" />
              </div>
            ) : advisory ? (
              <div>
                <div className={`text-center py-4 rounded-xl mb-4 ${advisory.recommendation === 'hold' ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                  <div className="text-4xl mb-1">{advisory.recommendation === 'hold' ? '🟢' : '🔴'}</div>
                  <p className={`text-lg font-bold ${advisory.recommendation === 'hold' ? 'text-green-700' : 'text-amber-700'}`}>
                    {advisory.recommendation === 'hold' ? 'HOLD' : 'SELL NOW'}
                  </p>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2 mx-auto max-w-[120px]">
                      <div className={`h-2 rounded-full ${advisory.recommendation === 'hold' ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.round(advisory.confidence * 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{Math.round(advisory.confidence * 100)}% confidence</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{advisory.reason}</p>
                <p className="text-xs text-gray-400 mt-3">Based on 7-day moving average trend analysis</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">Select a crop to see advisory</p>
            )}
          </div>
        </div>

        {/* Price Table */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Latest Mandi Prices — {cropEmoji(selectedCrop)} {selectedCrop}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Mandi</th>
                  <th className="text-left px-5 py-3">District</th>
                  <th className="text-right px-5 py-3">Price / Quintal</th>
                  <th className="text-right px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">Loading...</td></tr>
                ) : latestPerMandi.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">No data found</td></tr>
                ) : (
                  latestPerMandi.map(p => (
                    <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{p.mandi}</td>
                      <td className="px-5 py-3 text-gray-500">{p.district}</td>
                      <td className="px-5 py-3 text-right font-bold text-[#2D7D32]">{formatCurrency(p.price_per_quintal)}</td>
                      <td className="px-5 py-3 text-right text-gray-400">{formatDateShort(p.recorded_on)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { MandiPrice, ForecastResult, CROPS } from '@/lib/types'
import { getAllDistricts } from '@/lib/data/india-locations'
import { formatCurrency, formatDateShort, cropEmoji } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Brain, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import {
  ComposedChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Area,
} from 'recharts'

const CHART_COLORS: Record<string, string> = {
  Indore: '#2D7D32', Bhopal: '#1976D2', Nagpur: '#F57C00', Pune: '#7B1FA2', Jaipur: '#C62828',
}

interface ExtendedForecast extends ForecastResult {
  predicted_prices: Array<{ date: string; price: number; confidence_low: number; confidence_high: number }>
  trend: 'rising' | 'falling' | 'stable'
  trend_strength: number
  method?: string
}

export default function PricesPage() {
  const supabase = createClient()
  const { t } = useTranslation()
  const [profile, setProfile] = useState<any>(null)
  const [prices, setPrices] = useState<MandiPrice[]>([])
  const [selectedCrop, setSelectedCrop] = useState('Wheat')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [advisory, setAdvisory] = useState<ExtendedForecast | null>(null)
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

    // Build chart data
    const byDate: Record<string, Record<string, number>> = {}
    for (const p of (data ?? [])) {
      if (!byDate[p.recorded_on]) byDate[p.recorded_on] = {}
      byDate[p.recorded_on][p.district] = p.price_per_quintal
    }
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14)
    setChartData(sorted.map(([date, vals]) => ({ date: formatDateShort(date), ...vals, isForecast: false })))

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
  }, [selectedCrop, selectedDistrict]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPrices() }, [fetchPrices])

  const fetchAdvisory = useCallback(async () => {
    setAdvisoryLoading(true)
    const prices14 = chartData.map(d => {
      const val = selectedDistrict ? d[selectedDistrict] : Object.values(d).find(v => typeof v === 'number' && v > 0)
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
  }, [chartData, selectedCrop, selectedDistrict])

  useEffect(() => { if (chartData.length >= 3) fetchAdvisory() }, [chartData, fetchAdvisory])

  // Merge historical + forecast data for chart
  const combinedChartData = [
    ...chartData,
    ...(advisory?.predicted_prices ?? []).map((p, i) => ({
      date: `F+${i + 1}`,
      forecast: p.price,
      ci_low: p.confidence_low,
      ci_high: p.confidence_high,
      isForecast: true,
    })),
  ]

  const latestPerMandi: MandiPrice[] = []
  const seenMandi = new Set<string>()
  for (const p of prices) {
    if (!seenMandi.has(p.mandi)) { seenMandi.add(p.mandi); latestPerMandi.push(p) }
  }

  const activeDistricts = selectedDistrict ? [selectedDistrict] : getAllDistricts().slice(0, 10)

  const trendColor = advisory?.trend === 'rising' ? 'text-green-600'
    : advisory?.trend === 'falling' ? 'text-red-500' : 'text-blue-500'
  const TrendIcon = advisory?.trend === 'rising' ? ArrowUpRight
    : advisory?.trend === 'falling' ? ArrowDownRight : Minus

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📊 {t('nav.prices')}</h1>
          {advisory?.trend && (
            <span className={`flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-full ${
              advisory.trend === 'rising' ? 'bg-green-100 text-green-700'
              : advisory.trend === 'falling' ? 'bg-red-100 text-red-600'
              : 'bg-blue-100 text-blue-600'
            }`}>
              <TrendIcon className="w-4 h-4" />
              {t(`ai.${advisory.trend}`)}
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select value={selectedCrop} onChange={e => setSelectedCrop(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D7D32] shadow-sm">
            {CROPS.map(c => <option key={c} value={c}>{cropEmoji(c)} {c}</option>)}
          </select>
          <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D7D32] shadow-sm">
            <option value="">All Mandis</option>
            {getAllDistricts().map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={fetchPrices}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" /> {t('common.retry').replace('Try again', 'Refresh')}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Highest', value: summary.max, color: 'text-green-600' },
            { label: 'Lowest', value: summary.min, color: 'text-red-500' },
            { label: 'Average', value: summary.avg, color: 'text-blue-600' },
            { label: t('dashboard.fromYesterday'), value: summary.trend, color: summary.trend >= 0 ? 'text-green-600' : 'text-red-500', isChange: true },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 card-hover">
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
              <p className="text-xs text-gray-400">{t('common.perQuintal')}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart with Forecast */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">
                14-Day Trend + 7-Day Forecast — {cropEmoji(selectedCrop)} {selectedCrop}
              </h2>
              {advisory?.predicted_prices && advisory.predicted_prices.length > 0 && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="w-8 border-t-2 border-dashed border-purple-400 inline-block" />
                  Forecast
                </span>
              )}
            </div>

            {loading ? (
              <div className="h-56 flex items-center justify-center text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-[#2D7D32] rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={combinedChartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(1)}k`} width={55} />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      formatCurrency(v),
                      name === 'forecast' ? '🔮 Forecast' : name === 'ci_high' ? '📈 CI High' : name === 'ci_low' ? '📉 CI Low' : name,
                    ]}
                  />
                  <Legend />

                  {/* Historical lines */}
                  {activeDistricts.filter(d => chartData.some(row => row[d])).map(d => (
                    <Line key={d} type="monotone" dataKey={d} stroke={CHART_COLORS[d] ?? '#2D7D32'}
                      strokeWidth={2} dot={false} connectNulls />
                  ))}

                  {/* Forecast line (dashed) */}
                  {advisory?.predicted_prices && advisory.predicted_prices.length > 0 && (
                    <Line type="monotone" dataKey="forecast" stroke="#7C3AED"
                      strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#7C3AED' }}
                      connectNulls name="Forecast" />
                  )}

                  {/* CI area */}
                  {advisory?.predicted_prices && advisory.predicted_prices.length > 0 && (
                    <Area type="monotone" dataKey="ci_high" stroke="transparent" fill="#7C3AED" fillOpacity={0.08} />
                  )}

                  {/* Separator line between historical and forecast */}
                  {advisory?.predicted_prices && advisory.predicted_prices.length > 0 && (
                    <ReferenceLine x={chartData[chartData.length - 1]?.date} stroke="#999" strokeDasharray="4 4" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}

            {advisory?.predicted_prices && advisory.predicted_prices.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {advisory.predicted_prices.slice(0, 4).map((p, i) => (
                  <div key={p.date} className="text-center bg-purple-50 rounded-lg py-1.5 px-1">
                    <p className="text-[10px] text-purple-500 font-medium">+{i + 1}d</p>
                    <p className="text-xs font-bold text-purple-700">₹{p.price.toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
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
                {/* Recommendation */}
                <div className={`text-center py-4 rounded-xl mb-4 ${
                  advisory.recommendation === 'hold'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="text-4xl mb-1">{advisory.recommendation === 'hold' ? '🟢' : '🔴'}</div>
                  <p className={`text-lg font-bold ${advisory.recommendation === 'hold' ? 'text-green-700' : 'text-amber-700'}`}>
                    {advisory.recommendation === 'hold' ? t('dashboard.hold') : t('dashboard.sellNow')}
                  </p>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2 mx-auto max-w-[120px]">
                      <div className={`h-2 rounded-full ${advisory.recommendation === 'hold' ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.round(advisory.confidence * 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{Math.round(advisory.confidence * 100)}% {t('dashboard.confidence')}</p>
                  </div>
                </div>

                {/* Trend badge */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 ${
                  advisory.trend === 'rising' ? 'bg-green-50 text-green-700'
                  : advisory.trend === 'falling' ? 'bg-red-50 text-red-600'
                  : 'bg-blue-50 text-blue-600'
                }`}>
                  <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                  <span className="text-sm font-semibold">{t(`ai.${advisory.trend}`)}</span>
                  <span className="ml-auto text-xs opacity-70">
                    {Math.round(advisory.trend_strength * 100)}% strength
                  </span>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">{advisory.reason}</p>
                <p className="text-xs text-gray-400 mt-3">
                  {advisory.method === 'holt_winters_double'
                    ? '🤖 Holt-Winters Double Smoothing'
                    : 'Based on moving average trend analysis'}
                </p>
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
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">{t('common.loading')}</td></tr>
                ) : latestPerMandi.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">{t('common.noData')}</td></tr>
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

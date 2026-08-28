'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { Lot, CROPS, GRADES } from '@/lib/types'
import { getAllDistricts } from '@/lib/data/india-locations'
import { formatCurrency, cropEmoji, getStatusColor } from '@/lib/utils'
import Link from 'next/link'
import { Filter, Search, ShoppingCart, Star } from 'lucide-react'

export default function BuyerBrowsePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [lots, setLots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [filters, setFilters] = useState({
    crops: [] as string[],
    districts: [] as string[],
    grades: [] as string[],
    minQty: '',
    maxPrice: '',
  })

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
    })
  }, [])

  useEffect(() => { fetchLots() }, [filters])

  async function fetchLots() {
    setLoading(true)
    let query = supabase
      .from('lots')
      .select('*, owner:profiles(full_name, company_name, trust_score, district)')
      .in('status', ['listed', 'offer_received'])
      .order('created_at', { ascending: false })

    if (filters.crops.length > 0) query = query.in('crop', filters.crops)
    if (filters.districts.length > 0) query = query.in('location_district', filters.districts)
    if (filters.grades.length > 0) query = query.in('grade', filters.grades)
    if (filters.minQty) query = query.gte('quantity', parseFloat(filters.minQty))
    if (filters.maxPrice) query = query.lte('expected_price', parseFloat(filters.maxPrice))

    const { data } = await query
    setLots(data ?? [])
    setLoading(false)

    // Fetch match scores
    if (profile?.id && data) {
      const scoreMap: Record<string, number> = {}
      await Promise.all(
        (data ?? []).slice(0, 10).map(async (lot: Lot) => {
          const res = await fetch('/api/match-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ buyerId: profile.id, lotId: lot.id }),
          })
          if (res.ok) {
            const { score } = await res.json()
            scoreMap[lot.id] = score
          }
        })
      )
      setScores(scoreMap)
    }
  }

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">🛒 Browse Lots</h1>

        <div className="flex gap-6">
          {/* Sidebar filters */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-gray-700 text-sm">Filters</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Crop</p>
                  <div className="space-y-1.5">
                    {CROPS.map(c => (
                      <label key={c} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={filters.crops.includes(c)}
                          onChange={() => setFilters(f => ({ ...f, crops: toggle(f.crops, c) }))}
                          className="rounded text-[#2D7D32]" />
                        <span className="text-sm text-gray-600">{cropEmoji(c)} {c}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">District</p>
                  <div className="space-y-1.5">
                    {getAllDistricts().map(d => (
                      <label key={d} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={filters.districts.includes(d)}
                          onChange={() => setFilters(f => ({ ...f, districts: toggle(f.districts, d) }))}
                          className="rounded text-[#2D7D32]" />
                        <span className="text-sm text-gray-600">{d}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Grade</p>
                  <div className="space-y-1.5">
                    {GRADES.map(g => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={filters.grades.includes(g)}
                          onChange={() => setFilters(f => ({ ...f, grades: toggle(f.grades, g) }))}
                          className="rounded text-[#2D7D32]" />
                        <span className="text-sm text-gray-600">Grade {g}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Min Quantity (q)</p>
                  <input type="number" value={filters.minQty}
                    onChange={e => setFilters(f => ({ ...f, minQty: e.target.value }))}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Max Price (₹/q)</p>
                  <input type="number" value={filters.maxPrice}
                    onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                    placeholder="e.g. 6000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
                </div>
                <button onClick={() => setFilters({ crops: [], districts: [], grades: [], minQty: '', maxPrice: '' })}
                  className="w-full text-xs text-red-500 hover:underline">Clear all filters</button>
              </div>
            </div>
          </aside>

          {/* Lots grid */}
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-4">{lots.length} lot{lots.length !== 1 ? 's' : ''} found</p>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse h-48" />
                ))}
              </div>
            ) : lots.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">No lots match your filters</p>
                <button onClick={() => setFilters({ crops: [], districts: [], grades: [], minQty: '', maxPrice: '' })}
                  className="text-sm text-[#2D7D32] hover:underline mt-2">Clear filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {lots.map(lot => {
                  const score = scores[lot.id]
                  return (
                    <Link key={lot.id} href={`/lots/${lot.id}`}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all card-hover group">
                      {/* Match score badge */}
                      {score !== undefined && (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold mb-3 ${score >= 70 ? 'bg-green-100 text-green-700' : score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          <Star className="w-3 h-3" />
                          {score}% Match
                        </div>
                      )}

                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-3xl">{cropEmoji(lot.crop ?? '')}</span>
                          <h3 className="font-bold text-gray-800 mt-1">{lot.crop}</h3>
                          <p className="text-xs text-gray-500">{lot.variety ?? ''} • Grade {lot.grade}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#2D7D32]">{lot.expected_price ? formatCurrency(lot.expected_price) : '—'}</p>
                          <p className="text-xs text-gray-400">per {lot.unit}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-medium">{lot.quantity} {lot.unit}</span>
                        <span className="text-sm text-gray-500">📍 {lot.location_district}</span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                          {lot.owner?.full_name ?? 'Farmer'} • Trust {lot.owner?.trust_score ?? 50}/100
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lot.status === 'offer_received' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {lot.status === 'offer_received' ? 'Has offers' : 'Available'}
                        </span>
                      </div>

                      <button className="mt-3 w-full bg-[#F9A825] hover:bg-amber-500 text-[#1B5E20] py-2 rounded-xl text-sm font-bold transition-all">
                        View & Make Offer
                      </button>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { useTranslation } from '@/lib/i18n'
import { DISTRICTS } from '@/lib/types'
import { estimateTransportCost, TransportEstimate } from '@/lib/services/logistics'
import { Truck, Snowflake, Warehouse, MapPin, Calculator, Phone, ArrowRight } from 'lucide-react'

export default function LogisticsPage() {
  const supabase = createClient()
  const { t } = useTranslation()
  const [profile, setProfile] = useState<any>(null)
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'transporters' | 'coldStorage' | 'warehouses'>('transporters')

  // Transport estimate
  const [fromDistrict, setFromDistrict] = useState('')
  const [toDistrict, setToDistrict] = useState('')
  const [quantity, setQuantity] = useState('')
  const [estimate, setEstimate] = useState<TransportEstimate | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
        if (data?.district) setFromDistrict(data.district)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function load() {
      setLoading(true)
      const typeMap = { transporters: 'transporter', coldStorage: 'cold_storage', warehouses: 'warehouse' }
      const { data } = await supabase
        .from('logistics_providers')
        .select('*')
        .eq('type', typeMap[tab])
        .eq('is_active', true)
        .order('district')
      setProviders(data ?? [])
      setLoading(false)
    }
    load()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const calculateEstimate = () => {
    if (!fromDistrict || !toDistrict || !quantity) return
    const est = estimateTransportCost(fromDistrict, toDistrict, parseFloat(quantity))
    setEstimate(est)
  }

  const typeIcons = {
    transporters: Truck,
    coldStorage: Snowflake,
    warehouses: Warehouse,
  }

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Truck className="w-6 h-6 text-[#2D7D32]" />
          <h1 className="text-2xl font-bold text-gray-800">{t('logistics.title')}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Transport Calculator */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-[#2D7D32]" />
                <h2 className="font-semibold text-gray-800">{t('logistics.estimateCost')}</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('logistics.from')}</label>
                  <select value={fromDistrict} onChange={e => setFromDistrict(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D7D32]">
                    <option value="">Select</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-4 h-4 text-gray-300 rotate-90" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('logistics.to')}</label>
                  <select value={toDistrict} onChange={e => setToDistrict(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D7D32]">
                    <option value="">Select</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('lot.quantity')} (quintals)</label>
                  <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                    min="1" placeholder="100"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
                </div>
                <button onClick={calculateEstimate}
                  disabled={!fromDistrict || !toDistrict || !quantity}
                  className="w-full bg-[#2D7D32] hover:bg-[#1B5E20] text-white py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 shadow-md">
                  🚛 {t('logistics.estimateCost')}
                </button>
              </div>

              {/* Estimate result */}
              {estimate && (
                <div className="mt-4 bg-[#F1F8E9] border border-green-200 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('ai.distance')}</span>
                    <span className="font-bold text-gray-800">{estimate.distance_km} km</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('logistics.estimatedCost')}</span>
                    <span className="font-bold text-[#2D7D32]">₹{estimate.transport_cost.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Per quintal</span>
                    <span className="font-semibold text-gray-700">₹{estimate.cost_per_quintal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Est. travel</span>
                    <span className="font-semibold text-gray-700">~{estimate.estimated_hours}h</span>
                  </div>
                  <p className="text-[10px] text-gray-400 pt-1">Rate: ₹{estimate.rate_per_km}/km/tonne</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Providers */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {(['transporters', 'coldStorage', 'warehouses'] as const).map(tabKey => {
                const Icon = typeIcons[tabKey]
                const labels = {
                  transporters: t('logistics.transporters'),
                  coldStorage: t('logistics.coldStorage'),
                  warehouses: t('logistics.warehouses'),
                }
                return (
                  <button key={tabKey} onClick={() => setTab(tabKey)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      tab === tabKey ? 'bg-[#2D7D32] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    <Icon className="w-4 h-4" />
                    {labels[tabKey]}
                  </button>
                )
              })}
            </div>

            {/* Provider list */}
            <div className="space-y-3">
              {loading ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-[#2D7D32] rounded-full animate-spin mx-auto" />
                </div>
              ) : providers.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <p className="text-gray-400 text-sm">No {tab === 'coldStorage' ? 'cold storage' : tab} providers found.</p>
                  <p className="text-xs text-gray-400 mt-1">Providers are seeded in the database for demo districts.</p>
                </div>
              ) : (
                providers.map((p: any) => (
                  <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-800">{p.name}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            p.type === 'transporter' ? 'bg-blue-100 text-blue-700'
                            : p.type === 'cold_storage' ? 'bg-cyan-100 text-cyan-700'
                            : 'bg-orange-100 text-orange-700'
                          }`}>
                            {p.type === 'transporter' ? '🚛 Transporter' : p.type === 'cold_storage' ? '❄️ Cold Storage' : '🏭 Warehouse'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                          <MapPin className="w-3 h-3" /> {p.district} {p.address ? `• ${p.address}` : ''}
                        </div>
                        <div className="flex gap-4 text-xs">
                          {p.rate_per_km && (
                            <span className="text-gray-600">
                              {t('logistics.ratePerKm')}: <strong>₹{p.rate_per_km}</strong>
                            </span>
                          )}
                          {p.capacity_tons && (
                            <span className="text-gray-600">
                              {t('logistics.capacity')}: <strong>{p.capacity_tons}t</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      {p.contact_phone && (
                        <a href={`tel:${p.contact_phone}`}
                          className="flex items-center gap-1.5 text-xs bg-[#2D7D32] text-white px-3 py-2 rounded-xl font-medium hover:bg-[#1B5E20] transition-colors shrink-0">
                          <Phone className="w-3.5 h-3.5" /> {t('logistics.contact')}
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { BestPriceResult, RankedOffer } from '@/lib/services/best-price'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Truck, Star, CheckCircle } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface Props {
  lotId: string
  farmerDistrict: string
  quantity: number
}

export function BestDealFinder({ lotId, farmerDistrict, quantity }: Props) {
  const { t } = useTranslation()
  const [result, setResult] = useState<BestPriceResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/best-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lot_id: lotId, farmer_district: farmerDistrict, quantity }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setResult(data as BestPriceResult)
      })
      .catch(() => setError('Failed to load offer rankings'))
      .finally(() => setLoading(false))
  }, [lotId, farmerDistrict, quantity])

  if (loading) return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-[#2D7D32]" />
        <h2 className="font-semibold text-gray-800">{t('ai.bestPrice')}</h2>
      </div>
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-[#2D7D32] rounded-full animate-spin" />
      </div>
    </div>
  )

  if (error || !result || result.rankings.length === 0) return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-5 h-5 text-[#2D7D32]" />
        <h2 className="font-semibold text-gray-800">{t('ai.bestPrice')}</h2>
      </div>
      <p className="text-sm text-gray-500 text-center py-4">
        {result?.rankings.length === 0 ? 'No offers to compare yet.' : 'Could not load offer analysis.'}
      </p>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-[#2D7D32]" />
        <h2 className="font-semibold text-gray-800">{t('ai.bestPrice')}</h2>
      </div>

      {/* AI Recommendation */}
      <div className="bg-[#F1F8E9] border border-green-200 rounded-xl p-3 mb-4 text-xs text-green-800 leading-relaxed">
        💡 {result.recommendation}
      </div>

      <div className="space-y-3">
        {result.rankings.map((offer: RankedOffer) => (
          <div key={offer.buyer_id}
            className={`relative rounded-xl p-4 border transition-all ${
              offer.is_best
                ? 'border-[#2D7D32] bg-[#F1F8E9] shadow-md'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            {offer.is_best && (
              <div className="absolute -top-2.5 left-3 bg-[#2D7D32] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-current" /> {t('ai.bestDeal')}
              </div>
            )}

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-800">#{offer.rank} {offer.buyer_name}</p>
                  {offer.kyc_verified && (
                    <span title="KYC Verified"><CheckCircle className="w-3.5 h-3.5 text-blue-500" /></span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{offer.buyer_district} • {offer.distance_km} km</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[#2D7D32]">
                  {t('ai.netProfit')}: {formatCurrency(offer.net_profit)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(offer.net_price_per_unit)}/{t('common.perQuintal').replace('per ', '')}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-gray-400">Offer</p>
                <p className="font-semibold text-gray-800">{formatCurrency(offer.offer_price)}/q</p>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-gray-400 flex items-center justify-center gap-0.5">
                  <Truck className="w-3 h-3" /> {t('ai.transportCost')}
                </p>
                <p className="font-semibold text-orange-600">-{formatCurrency(offer.transport_cost)}</p>
              </div>
              <div className={`rounded-lg p-2 text-center ${offer.is_best ? 'bg-[#2D7D32]' : 'bg-white'}`}>
                <p className={`${offer.is_best ? 'text-green-100' : 'text-gray-400'}`}>Net/q</p>
                <p className={`font-bold ${offer.is_best ? 'text-white' : 'text-gray-800'}`}>
                  {formatCurrency(offer.net_price_per_unit)}
                </p>
              </div>
            </div>

            {offer.trust_score > 0 && (
              <div className="mt-2 flex items-center gap-1">
                <div className="flex-1 bg-gray-200 rounded-full h-1">
                  <div className="bg-[#2D7D32] h-1 rounded-full" style={{ width: `${offer.trust_score}%` }} />
                </div>
                <span className="text-xs text-gray-400">Trust {offer.trust_score}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

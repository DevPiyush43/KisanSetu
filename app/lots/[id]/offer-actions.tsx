'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import { toast } from 'sonner'
import { Check, X, ArrowRightLeft } from 'lucide-react'

interface OfferActionsProps {
  offers: any[]
  lotId: string
  userId: string
}

export function OfferActions({ offers, lotId, userId }: OfferActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [counterOffer, setCounterOffer] = useState<{ offerId: string; price: string } | null>(null)

  const updateOffer = async (offerId: string, status: string, counterPrice?: number) => {
    setLoading(offerId)
    const { error } = await supabase
      .from('offers')
      .update({ status, ...(counterPrice ? { counter_price: counterPrice } : {}) })
      .eq('id', offerId)

    if (error) { toast.error('Failed to update offer'); setLoading(null); return }

    if (status === 'accepted') {
      // Find the offer
      const offer = offers.find(o => o.id === offerId)
      if (offer) {
        // Create contract
        const { data: contract, error: contractErr } = await supabase.from('contracts').insert({
          offer_id: offerId,
          lot_id: lotId,
          farmer_id: userId,
          buyer_id: offer.buyer_id,
          final_price: counterPrice ?? offer.price,
          final_quantity: offer.quantity,
          terms: {
            crop: offer.lot?.crop,
            pickup_date: offer.pickup_date,
            note: offer.note,
            signed_at: new Date().toISOString(),
            payment_terms: '50% advance, 50% on delivery',
          }
        }).select('id').single()

        if (!contractErr && contract) {
          // Create payment record
          await supabase.from('payments').insert({
            contract_id: contract.id,
            status: 'pending',
            total_amount: (counterPrice ?? offer.price) * offer.quantity,
          })
          // Update lot status
          await supabase.from('lots').update({ status: 'sold' }).eq('id', lotId)
          // Write ledger
          await fetch('/api/ledger-write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_type: 'offer_accepted',
              ref_id: contract.id,
              actor_id: userId,
              payload: { lot_id: lotId, offer_id: offerId, final_price: counterPrice ?? offer.price }
            }),
          })
          toast.success('Offer accepted! Contract created.')
          router.push(`/contracts/${contract.id}`)
          return
        }
      }
    }

    if (status === 'rejected') toast.success('Offer rejected.')
    if (status === 'countered') toast.success('Counter-offer sent!')
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {offers.map(offer => (
        <div key={offer.id} className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-sm text-gray-800">
                {offer.buyer?.company_name ?? offer.buyer?.full_name ?? 'Buyer'}
              </p>
              <p className="text-xs text-gray-500">{offer.buyer?.district} • Trust: {offer.buyer?.trust_score ?? 50}/100</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(offer.status)}`}>
              {getStatusLabel(offer.status)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs mb-3">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-gray-400">Offer Price</p>
              <p className="font-bold text-[#2D7D32]">{formatCurrency(offer.price)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-gray-400">Quantity</p>
              <p className="font-bold text-gray-700">{offer.quantity} q</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-gray-400">Pickup</p>
              <p className="font-bold text-gray-700">{offer.pickup_date ?? '—'}</p>
            </div>
          </div>
          {offer.note && (
            <p className="text-xs text-gray-500 italic mb-3">"{offer.note}"</p>
          )}

          {offer.status === 'pending' && (
            <>
              {counterOffer?.offerId === offer.id ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={counterOffer!.price}
                    onChange={e => setCounterOffer({ offerId: offer.id, price: e.target.value })}
                    placeholder="Your counter price"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]"
                  />
                  <button
                    onClick={() => { updateOffer(offer.id, 'countered', parseFloat(counterOffer!.price)); setCounterOffer(null) }}
                    disabled={!counterOffer!.price || loading === offer.id}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
                  >Send</button>
                  <button onClick={() => setCounterOffer(null)} className="px-3 py-2 bg-gray-100 rounded-lg text-xs">Cancel</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => updateOffer(offer.id, 'accepted')} disabled={loading === offer.id}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#2D7D32] text-white py-2 rounded-lg text-xs font-semibold hover:bg-[#1B5E20] transition-colors disabled:opacity-50">
                    {loading === offer.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="w-3 h-3" /> Accept</>}
                  </button>
                  <button onClick={() => setCounterOffer({ offerId: offer.id, price: '' })}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-200">
                    <ArrowRightLeft className="w-3 h-3" /> Counter
                  </button>
                  <button onClick={() => updateOffer(offer.id, 'rejected')} disabled={loading === offer.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200">
                    <X className="w-3 h-3" /> Reject
                  </button>
                </div>
              )}
            </>
          )}
          {offer.counter_price && (
            <p className="text-xs text-purple-600 font-medium mt-2">Counter: {formatCurrency(offer.counter_price)}/q</p>
          )}
        </div>
      ))}
    </div>
  )
}

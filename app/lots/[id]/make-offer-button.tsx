'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { HandshakeIcon } from 'lucide-react'

interface MakeOfferButtonProps {
  lotId: string
  userId: string
  expectedPrice: number | null
}

export function MakeOfferButton({ lotId, userId, expectedPrice }: MakeOfferButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    price: expectedPrice?.toString() ?? '',
    quantity: '',
    pickup_date: '',
    note: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('offers').insert({
      lot_id: lotId,
      buyer_id: userId,
      price: parseFloat(form.price),
      quantity: parseFloat(form.quantity),
      pickup_date: form.pickup_date || null,
      note: form.note || null,
      status: 'pending',
    })

    if (error) { toast.error('Failed to submit offer: ' + error.message); setLoading(false); return }

    // Update lot status
    await supabase.from('lots').update({ status: 'offer_received' }).eq('id', lotId)
    toast.success('Offer submitted successfully!')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-[#F9A825] hover:bg-amber-500 text-[#1B5E20] py-3 rounded-xl font-bold text-sm shadow-md transition-all hover:shadow-lg">
        <HandshakeIcon className="w-4 h-4" /> Make an Offer
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Submit Your Offer</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Price (₹ per quintal) *</label>
                <input type="number" required value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  min="1" placeholder={expectedPrice?.toString() ?? '2000'}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825]" />
                {expectedPrice && <p className="text-xs text-gray-400 mt-1">Farmer asks {formatCurrency(expectedPrice)}/q</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity (quintals) *</label>
                <input type="number" required value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  min="1" placeholder="100"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Pickup Date</label>
                <input type="date" value={form.pickup_date} onChange={e => setForm(f => ({ ...f, pickup_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Note (optional)</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  rows={2} placeholder="Any special requirements or terms..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825] resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-[#F9A825] hover:bg-amber-500 text-[#1B5E20] py-2.5 rounded-xl font-bold text-sm disabled:opacity-60 transition-all">
                  {loading ? 'Submitting...' : '🤝 Submit Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

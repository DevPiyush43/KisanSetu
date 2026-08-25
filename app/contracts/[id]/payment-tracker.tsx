'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Payment } from '@/lib/types'
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'
import { toast } from 'sonner'
import { CreditCard, CheckCircle } from 'lucide-react'

interface PaymentTrackerProps {
  payment: Payment
  contractId: string
  userId: string
  isBuyer: boolean
  totalValue: number
}

export function PaymentTracker({ payment, contractId, userId, isBuyer, totalValue }: PaymentTrackerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [amount, setAmount] = useState('')

  const pct = totalValue > 0 ? Math.min((payment.amount_paid / totalValue) * 100, 100) : 0
  const remaining = totalValue - payment.amount_paid

  const handleMarkPayment = async () => {
    setLoading(true)
    const amtNum = parseFloat(amount)
    if (isNaN(amtNum) || amtNum <= 0) { toast.error('Enter a valid amount'); setLoading(false); return }

    const newPaid = payment.amount_paid + amtNum
    const newStatus = newPaid >= totalValue ? 'paid' : 'partially_paid'

    const { error } = await supabase
      .from('payments')
      .update({ amount_paid: newPaid, status: newStatus, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', payment.id)

    if (error) { toast.error('Failed to update payment'); setLoading(false); return }

    // Write ledger event
    await fetch('/api/ledger-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: newStatus === 'paid' ? 'payment_paid' : 'payment_partial',
        ref_id: contractId,
        actor_id: userId,
        payload: { amount_paid: amtNum, total: totalValue, new_status: newStatus }
      }),
    })

    toast.success(newStatus === 'paid' ? 'Payment marked as complete!' : 'Partial payment recorded')
    setShowDialog(false)
    setAmount('')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#2D7D32]" /> Payment Status
        </h2>
        <span className={`text-sm px-3 py-1 rounded-full font-semibold ${getStatusColor(payment.status)}`}>
          {getStatusLabel(payment.status)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1.5">
          <span>Paid: {formatCurrency(payment.amount_paid)}</span>
          <span>Total: {formatCurrency(totalValue)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${payment.status === 'paid' ? 'bg-green-500' : 'bg-[#F9A825]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{pct.toFixed(0)}% paid • Remaining: {formatCurrency(remaining)}</p>
      </div>

      {payment.status === 'paid' ? (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">Payment Complete ✓</span>
        </div>
      ) : isBuyer ? (
        <>
          <button onClick={() => setShowDialog(true)}
            className="w-full bg-[#F9A825] hover:bg-amber-500 text-[#1B5E20] py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm">
            💳 Mark Payment Sent
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            {/* TODO(phase-2): Connect to real payment gateway (Razorpay/UPI) */}
            Mock payment for prototype — real gateway in Phase 2
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-500 text-center py-2">Waiting for buyer to confirm payment</p>
      )}

      {/* Payment dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Mark Payment</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount Paid (₹)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder={remaining.toString()} min="1" max={remaining.toString()}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825]" />
              <p className="text-xs text-gray-400 mt-1">Outstanding: {formatCurrency(remaining)}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDialog(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={handleMarkPayment} disabled={loading}
                className="flex-1 bg-[#F9A825] hover:bg-amber-500 text-[#1B5E20] py-2.5 rounded-xl font-bold text-sm disabled:opacity-60">
                {loading ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

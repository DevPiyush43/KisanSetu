'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Payment } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import { CreditCard, CheckCircle, Circle, Truck, Search, Banknote } from 'lucide-react'

interface PaymentTrackerProps {
  payment: Payment
  contractId: string
  userId: string
  isBuyer: boolean
  totalValue: number
}

const MILESTONES = [
  { key: 'advance_paid', icon: Banknote, pct: 25 },
  { key: 'pickup_confirmed', icon: Truck, pct: 50 },
  { key: 'quality_verified', icon: Search, pct: 75 },
  { key: 'full_payment', icon: CheckCircle, pct: 100 },
] as const

type MilestoneKey = (typeof MILESTONES)[number]['key']

export function PaymentTracker({ payment, contractId, userId, isBuyer, totalValue }: PaymentTrackerProps) {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('upi')

  const currentMilestone = (payment.milestone as MilestoneKey) ?? 'advance_paid'
  const currentMilestoneIdx = MILESTONES.findIndex(m => m.key === currentMilestone)
  const pct = totalValue > 0 ? Math.min((payment.amount_paid / totalValue) * 100, 100) : 0
  const remaining = totalValue - payment.amount_paid

  const milestoneLabels: Record<MilestoneKey, string> = {
    advance_paid: t('payment.advance'),
    pickup_confirmed: t('payment.pickup'),
    quality_verified: t('payment.quality'),
    full_payment: t('payment.full'),
  }

  const advanceMilestone = async (milestoneKey: MilestoneKey) => {
    setLoading(true)
    const nextIdx = MILESTONES.findIndex(m => m.key === milestoneKey)

    const updates: Record<string, unknown> = {
      milestone: milestoneKey,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }

    if (milestoneKey === 'full_payment') {
      updates.status = 'paid'
      updates.amount_paid = totalValue
      updates.full_payment_at = new Date().toISOString()
    } else if (milestoneKey === 'advance_paid' && payment.amount_paid === 0) {
      const advanceAmt = Math.round(totalValue * 0.25)
      updates.amount_paid = advanceAmt
      updates.advance_amount = advanceAmt
      updates.advance_paid_at = new Date().toISOString()
      updates.status = 'partially_paid'
    }

    let { error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', payment.id)

    if (error && (error.message?.includes('schema cache') || error.message?.includes('Could not find'))) {
      const fbUpdates: Record<string, unknown> = {
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }
      if (milestoneKey === 'full_payment') {
        fbUpdates.status = 'paid'
        fbUpdates.amount_paid = totalValue
      } else if (milestoneKey === 'advance_paid' && payment.amount_paid === 0) {
        fbUpdates.amount_paid = Math.round(totalValue * 0.25)
        fbUpdates.status = 'partially_paid'
      }
      const fb = await supabase.from('payments').update(fbUpdates).eq('id', payment.id)
      error = fb.error
    }

    if (error) { toast.error('Failed: ' + error.message); setLoading(false); return }

    await fetch('/api/ledger-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: `payment_milestone_${milestoneKey}`,
        ref_id: contractId,
        actor_id: userId,
        payload: { milestone: milestoneKey, milestone_index: nextIdx },
      }),
    }).catch(() => {})

    toast.success(`✅ ${milestoneLabels[milestoneKey]} — confirmed!`)
    setLoading(false)
    router.refresh()
  }

  const handleMarkPayment = async () => {
    setLoading(true)
    const amtNum = parseFloat(amount)
    if (isNaN(amtNum) || amtNum <= 0) { toast.error('Enter a valid amount'); setLoading(false); return }

    const newPaid = payment.amount_paid + amtNum
    const newStatus = newPaid >= totalValue ? 'paid' : 'partially_paid'

    let { error } = await supabase
      .from('payments')
      .update({
        amount_paid: newPaid,
        status: newStatus,
        updated_by: userId,
        updated_at: new Date().toISOString(),
        payment_method: paymentMethod,
        ...(newStatus === 'paid' ? { milestone: 'full_payment', full_payment_at: new Date().toISOString() } : {}),
      })
      .eq('id', payment.id)

    if (error && (error.message?.includes('schema cache') || error.message?.includes('Could not find'))) {
      const fb = await supabase
        .from('payments')
        .update({
          amount_paid: newPaid,
          status: newStatus,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
      error = fb.error
    }

    if (error) { toast.error('Failed to update payment'); setLoading(false); return }

    await fetch('/api/ledger-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: newStatus === 'paid' ? 'payment_paid' : 'payment_partial',
        ref_id: contractId,
        actor_id: userId,
        payload: { amount_paid: amtNum, total: totalValue, new_status: newStatus, method: paymentMethod },
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
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#2D7D32]" /> {t('payment.status')}
        </h2>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
          payment.status === 'paid' ? 'bg-green-100 text-green-700'
          : payment.status === 'partially_paid' ? 'bg-amber-100 text-amber-700'
          : 'bg-gray-100 text-gray-600'
        }`}>
          {payment.status === 'paid' ? t('payment.completed') : payment.status === 'partially_paid' ? 'Partial' : 'Pending'}
        </span>
      </div>

      {/* Milestone Stepper */}
      <div className="mb-5">
        <div className="flex items-center justify-between relative">
          {/* Connector line */}
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-200 z-0" />
          <div className="absolute left-0 top-5 h-0.5 bg-[#2D7D32] z-0 transition-all duration-500"
            style={{ width: `${Math.min(currentMilestoneIdx / (MILESTONES.length - 1) * 100, 100)}%` }} />

          {MILESTONES.map((m, i) => {
            const Icon = m.icon
            const done = i <= currentMilestoneIdx
            const isCurrent = i === currentMilestoneIdx
            const isNext = i === currentMilestoneIdx + 1

            return (
              <div key={m.key} className="relative z-10 flex flex-col items-center" style={{ width: `${100 / MILESTONES.length}%` }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 ${
                  done ? 'bg-[#2D7D32] border-[#2D7D32] text-white'
                  : isCurrent ? 'bg-white border-[#F9A825] text-[#F9A825]'
                  : 'bg-white border-gray-200 text-gray-400'
                }`}>
                  {done && i < currentMilestoneIdx ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <p className={`text-[10px] mt-1.5 text-center font-medium leading-tight ${
                  done ? 'text-[#2D7D32]' : 'text-gray-400'
                }`}>
                  {milestoneLabels[m.key]}
                </p>

                {/* Advance milestone button for buyer */}
                {isBuyer && isNext && payment.status !== 'paid' && (
                  <button onClick={() => advanceMilestone(m.key)} disabled={loading}
                    className="mt-1.5 text-[9px] bg-[#F9A825] text-[#1B5E20] px-2 py-0.5 rounded-full font-bold hover:bg-amber-400 disabled:opacity-50">
                    Confirm →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Amount bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1.5">
          <span>Paid: {formatCurrency(payment.amount_paid)}</span>
          <span>Total: {formatCurrency(totalValue)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${payment.status === 'paid' ? 'bg-green-500' : 'bg-[#F9A825]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{pct.toFixed(0)}% • Remaining: {formatCurrency(remaining)}</p>
      </div>

      {/* Payment method badge */}
      {payment.payment_method && (
        <div className="text-xs text-gray-500 mb-3">
          {t('payment.method')}: <span className="font-semibold">
            {payment.payment_method === 'upi' ? '📱 UPI' : payment.payment_method === 'bank_transfer' ? '🏦 Bank Transfer' : '💵 Cash'}
          </span>
        </div>
      )}

      {payment.status === 'paid' ? (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">{t('payment.completed')} ✓</span>
        </div>
      ) : isBuyer ? (
        <>
          <button onClick={() => setShowDialog(true)}
            className="w-full bg-[#F9A825] hover:bg-amber-500 text-[#1B5E20] py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm">
            💳 Mark Payment Sent
          </button>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder={remaining.toString()} min="1"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A825]" />
              <p className="text-xs text-gray-400 mt-1">Outstanding: {formatCurrency(remaining)}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('payment.method')}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['upi', 'bank_transfer', 'cash'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                    className={`px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all ${paymentMethod === m ? 'border-[#F9A825] bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600'}`}>
                    {m === 'upi' ? `📱 ${t('payment.upi')}` : m === 'bank_transfer' ? `🏦 ${t('payment.bankTransfer')}` : `💵 ${t('payment.cash')}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDialog(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">{t('common.cancel')}</button>
              <button onClick={handleMarkPayment} disabled={loading}
                className="flex-1 bg-[#F9A825] hover:bg-amber-500 text-[#1B5E20] py-2.5 rounded-xl font-bold text-sm disabled:opacity-60">
                {loading ? 'Saving...' : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

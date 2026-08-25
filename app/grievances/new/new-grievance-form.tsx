'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { Upload, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const REASONS = [
  'Quality Mismatch',
  'Payment Delayed',
  'Quantity Incorrect',
  'Fraud / Misrepresentation',
  'Logistics / Delivery Issue',
  'Other',
]

export function NewGrievanceForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    contract_id: searchParams.get('contract') ?? '',
    reason: '',
    description: '',
  })

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)

      const { data: c } = await supabase
        .from('contracts')
        .select('id, lot:lots(crop), farmer:profiles!contracts_farmer_id_fkey(full_name), buyer:profiles!contracts_buyer_id_fkey(company_name, full_name)')
        .or(`farmer_id.eq.${user.id},buyer_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
      setContracts(c ?? [])
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contract_id) { toast.error('Please select a contract'); return }
    if (!form.reason) { toast.error('Please select a reason'); return }
    if (form.description.length < 30) { toast.error('Description must be at least 30 characters'); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let evidenceUrl: string | null = null
    if (evidenceFile) {
      const ext = evidenceFile.name.split('.').pop()
      const path = `grievances/${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('kyc-docs').upload(path, evidenceFile)
      if (!error) evidenceUrl = path
    }

    const { data: grievance, error } = await supabase.from('grievances').insert({
      contract_id: form.contract_id,
      filed_by: user.id,
      reason: form.reason,
      description: form.description,
      evidence_url: evidenceUrl,
      status: 'open',
    }).select('id').single()

    if (error) { toast.error('Failed to file grievance'); setLoading(false); return }

    await fetch('/api/ledger-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'grievance_filed',
        ref_id: grievance.id,
        actor_id: user.id,
        payload: { contract_id: form.contract_id, reason: form.reason }
      }),
    })

    toast.success('Grievance filed successfully. Admin will review within 48 hours.')
    router.push('/offers')
  }

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-red-500" /> File a Grievance
        </h1>
        <p className="text-sm text-gray-500 mb-6">Report issues with a contract. Our team will review within 48 hours.</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contract *</label>
              <select value={form.contract_id} onChange={e => setForm(f => ({ ...f, contract_id: e.target.value }))} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
                <option value="">Select a contract</option>
                {contracts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.lot?.crop} — {c.farmer?.full_name} ↔ {c.buyer?.company_name ?? c.buyer?.full_name} (#{c.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
              <div className="grid grid-cols-2 gap-2">
                {REASONS.map(r => (
                  <button key={r} type="button" onClick={() => setForm(f => ({ ...f, reason: r }))}
                    className={`px-3 py-2.5 rounded-xl border-2 text-sm text-left font-medium transition-all ${form.reason === r ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 hover:border-red-200 text-gray-700'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description * <span className="text-gray-400 font-normal">({form.description.length}/500, min 30)</span>
              </label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={5} maxLength={500} required
                placeholder="Describe the issue clearly. Include dates, amounts, and what was promised vs what happened..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Evidence (optional)</label>
              <label className={`block w-full border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${evidenceFile ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-red-200'}`}>
                <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <p className="text-sm text-gray-600">{evidenceFile ? evidenceFile.name : 'Upload photos / documents'}</p>
                <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, PDF • Max 10MB</p>
                <input type="file" accept="image/*,.pdf" onChange={e => setEvidenceFile(e.target.files?.[0] ?? null)} className="hidden" />
              </label>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              ⚠️ Filing a false grievance may negatively impact your Trust Score. Please provide accurate information.
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60 shadow-md">
              {loading ? 'Submitting...' : '🚨 Submit Grievance'}
            </button>
          </form>
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}

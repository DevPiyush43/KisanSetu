'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { DISTRICTS } from '@/lib/types'

export default function BuyerOnboarding() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [kycFile, setKycFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    full_name: '', phone: '', company_name: '', buyer_type: ''
  })
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([])

  const toggleDistrict = (d: string) => {
    setSelectedDistricts(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name.trim()) { toast.error('Company name required'); return }
    if (!form.buyer_type) { toast.error('Please select buyer type'); return }
    if (selectedDistricts.length === 0) { toast.error('Select at least one operating district'); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let kycUrl: string | null = null
    if (kycFile) {
      const ext = kycFile.name.split('.').pop()
      const path = `kyc/${user.id}/kyc-doc.${ext}`
      const { error: uploadError } = await supabase.storage.from('kyc-docs').upload(path, kycFile, { upsert: true })
      if (!uploadError) kycUrl = path
    }

    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name || form.company_name,
      phone: form.phone,
      company_name: form.company_name,
      buyer_type: form.buyer_type,
      operating_districts: selectedDistricts,
      kyc_doc_url: kycUrl,
    }).eq('id', user.id)

    if (error) { toast.error('Failed to save profile'); setLoading(false); return }
    toast.success('Profile saved! Browse available lots.')
    router.push('/buyer/browse')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-700 to-amber-500 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full mb-3">
            <Leaf className="w-5 h-5 text-white" />
            <span className="text-white font-bold">KisanSetu</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Buyer Profile Setup</h1>
          <p className="text-amber-100 text-sm mt-1">Tell us about your business</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Company / Business Name *</label>
                <input type="text" required value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="Agro Processing Pvt Ltd"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Name</label>
                <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="9900000001"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>

            {/* Buyer type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {[['processor', '🏭 Processor'], ['trader', '🏪 Trader'], ['institutional', '🏢 Institutional']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setForm(f => ({ ...f, buyer_type: val }))}
                    className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${form.buyer_type === val ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-200 hover:border-amber-300 text-gray-700'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Operating districts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Operating Districts * (select all)</label>
              <div className="flex flex-wrap gap-2">
                {DISTRICTS.map(d => {
                  const sel = selectedDistricts.includes(d)
                  return (
                    <button key={d} type="button" onClick={() => toggleDistrict(d)}
                      className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${sel ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-200 hover:border-amber-300 text-gray-700'}`}>
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* KYC upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">KYC Document (GST / PAN / Aadhar)</label>
              <label className={`w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${kycFile ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`}>
                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">{kycFile ? kycFile.name : 'Click to upload PDF or image'}</p>
                <p className="text-xs text-gray-400 mt-1">Max 10MB • PDF, JPG, PNG</p>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setKycFile(e.target.files?.[0] ?? null)} className="hidden" />
              </label>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-md">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🏭 Complete & Browse Lots'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

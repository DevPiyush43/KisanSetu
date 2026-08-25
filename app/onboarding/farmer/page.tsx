'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Check } from 'lucide-react'
import { toast } from 'sonner'
import { CROPS, DISTRICTS } from '@/lib/types'

export default function FarmerOnboarding() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '', phone: '', village: '', district: '', language_pref: 'hi'
  })
  const [selectedCrops, setSelectedCrops] = useState<string[]>([])

  const toggleCrop = (crop: string) => {
    setSelectedCrops(prev => prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim()) { toast.error('Please enter your full name'); return }
    if (selectedCrops.length === 0) { toast.error('Please select at least one crop'); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name.trim(),
      phone: form.phone,
      village: form.village,
      district: form.district,
      primary_crops: selectedCrops,
      language_pref: form.language_pref,
    }).eq('id', user.id)

    if (error) { toast.error('Failed to save profile'); setLoading(false); return }
    toast.success('Profile saved! Welcome to KisanSetu 🌾')
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B5E20] to-[#2D7D32] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full mb-3">
            <Leaf className="w-5 h-5 text-[#F9A825]" />
            <span className="text-white font-bold">KisanSetu</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Complete Your Profile</h1>
          <p className="text-green-200 text-sm mt-1">Help buyers find your produce</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                <input type="text" required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Ramesh Kumar"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="9876543210"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">District *</label>
                <select required value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] bg-white">
                  <option value="">Select district</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Village / Town</label>
                <input type="text" value={form.village} onChange={e => setForm(f => ({ ...f, village: e.target.value }))}
                  placeholder="Your village name"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
              </div>
            </div>

            {/* Crops */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Crops * (select all that apply)</label>
              <div className="grid grid-cols-3 gap-2">
                {CROPS.map(crop => {
                  const selected = selectedCrops.includes(crop)
                  return (
                    <button key={crop} type="button" onClick={() => toggleCrop(crop)}
                      className={`relative px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${selected ? 'border-[#2D7D32] bg-[#2D7D32] text-white' : 'border-gray-200 hover:border-green-300 text-gray-700'}`}>
                      {selected && <Check className="w-3 h-3 absolute top-1 right-1" />}
                      {crop}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Language</label>
              <div className="flex gap-3">
                {[['hi', 'हिंदी (Hindi)'], ['en', 'English']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setForm(f => ({ ...f, language_pref: val }))}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${form.language_pref === val ? 'border-[#2D7D32] bg-[#2D7D32] text-white' : 'border-gray-200 text-gray-700 hover:border-green-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-[#2D7D32] hover:bg-[#1B5E20] text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-md">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🌾 Complete Profile & Go to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

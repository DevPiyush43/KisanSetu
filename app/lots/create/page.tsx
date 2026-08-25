'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { CROPS, DISTRICTS, GRADES, UNITS } from '@/lib/types'
import { cropEmoji } from '@/lib/utils'
import { Upload, X, Check, ArrowLeft, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const STEPS = ['Crop Details', 'Quantity & Price', 'Photos', 'Review & Submit']

export default function CreateLotPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [form, setForm] = useState({
    crop: '', variety: '', grade: 'A', quality_notes: '',
    quantity: '', unit: 'quintal', expected_price: '',
    location_district: '', location_village: '', pickup_notes: '',
  })

  useState(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
        if (data?.district) setForm(f => ({ ...f, location_district: data.district, location_village: data.village ?? '' }))
        if (data?.primary_crops?.[0]) setForm(f => ({ ...f, crop: data.primary_crops[0] }))
      }
    })
  })

  const handlePhotoSelect = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 5 - photos.length)
    setPhotos(prev => [...prev, ...newFiles])
    setPreviewUrls(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))])
  }

  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== i))
    setPreviewUrls(prev => prev.filter((_, idx) => idx !== i))
  }

  const canProceed = () => {
    if (step === 0) return form.crop && form.grade
    if (step === 1) return form.quantity && form.expected_price && form.location_district
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Upload photos
    const photoUrls: string[] = []
    for (const photo of photos) {
      const ext = photo.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('lot-photos').upload(path, photo)
      if (!error) photoUrls.push(path)
    }

    const { data: lot, error } = await supabase.from('lots').insert({
      owner_id: user.id,
      crop: form.crop,
      variety: form.variety || null,
      grade: form.grade,
      quantity: parseFloat(form.quantity),
      unit: form.unit,
      expected_price: parseFloat(form.expected_price),
      location_district: form.location_district,
      location_village: form.location_village || null,
      photos: photoUrls,
      pickup_notes: form.pickup_notes || null,
      status: 'listed',
    }).select('id').single()

    if (error) {
      toast.error('Failed to create lot: ' + error.message)
      setLoading(false)
      return
    }

    // Write ledger event
    await fetch('/api/ledger-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'lot_created',
        ref_id: lot.id,
        actor_id: user.id,
        payload: { crop: form.crop, quantity: form.quantity, district: form.location_district }
      }),
    })

    toast.success('Lot created and listed successfully! 🌾')
    router.push('/lots')
  }

  const f = form
  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Create New Lot</h1>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < step ? 'bg-[#2D7D32] text-white' : i === step ? 'bg-[#2D7D32] text-white ring-4 ring-green-200' : 'bg-gray-200 text-gray-500'}`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className={`h-1 flex-1 rounded-full transition-all ${i < step ? 'bg-[#2D7D32]' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
          <p className="text-sm font-medium text-gray-600">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Step 0: Crop Details */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Crop *</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {CROPS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(fv => ({ ...fv, crop: c }))}
                      className={`flex flex-col items-center py-3 rounded-xl border-2 text-sm font-medium transition-all ${form.crop === c ? 'border-[#2D7D32] bg-[#2D7D32] text-white' : 'border-gray-200 hover:border-green-300 text-gray-700'}`}>
                      <span className="text-xl">{cropEmoji(c)}</span>
                      <span className="text-xs mt-1">{c}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Variety</label>
                  <input type="text" value={form.variety} onChange={e => setForm(fv => ({ ...fv, variety: e.target.value }))}
                    placeholder="e.g. Sharbati, Basmati 1121"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Grade *</label>
                  <select value={form.grade} onChange={e => setForm(fv => ({ ...fv, grade: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] bg-white">
                    {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Quality Notes</label>
                <textarea value={form.quality_notes} onChange={e => setForm(fv => ({ ...fv, quality_notes: e.target.value }))}
                  rows={2} placeholder="e.g. Freshly harvested, low moisture, clean..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] resize-none" />
              </div>
            </div>
          )}

          {/* Step 1: Quantity & Price */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity *</label>
                  <input type="number" value={form.quantity} onChange={e => setForm(fv => ({ ...fv, quantity: e.target.value }))}
                    min="0.1" step="0.1" placeholder="e.g. 100"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
                  <select value={form.unit} onChange={e => setForm(fv => ({ ...fv, unit: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] bg-white">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Price (₹ per {form.unit}) *</label>
                <input type="number" value={form.expected_price} onChange={e => setForm(fv => ({ ...fv, expected_price: e.target.value }))}
                  min="1" placeholder="e.g. 2250"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
                {form.quantity && form.expected_price && (
                  <p className="text-xs text-green-600 mt-1">
                    Total estimated value: ₹{(parseFloat(form.quantity) * parseFloat(form.expected_price)).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">District *</label>
                  <select value={form.location_district} onChange={e => setForm(fv => ({ ...fv, location_district: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] bg-white">
                    <option value="">Select district</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Village / Pickup Location</label>
                  <input type="text" value={form.location_village} onChange={e => setForm(fv => ({ ...fv, location_village: e.target.value }))}
                    placeholder="Your village"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Pickup Notes</label>
                <textarea value={form.pickup_notes} onChange={e => setForm(fv => ({ ...fv, pickup_notes: e.target.value }))}
                  rows={2} placeholder="e.g. Available Mon-Sat 8am-6pm, contact before arriving"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] resize-none" />
              </div>
            </div>
          )}

          {/* Step 2: Photos */}
          {step === 2 && (
            <div className="space-y-4">
              <label
                className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${photos.length >= 5 ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-300 hover:border-[#2D7D32] hover:bg-green-50'}`}>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">{photos.length >= 5 ? 'Maximum 5 photos reached' : 'Upload Lot Photos'}</p>
                <p className="text-xs text-gray-400 mt-1">Up to 5 photos • JPG, PNG, HEIC</p>
                <input type="file" accept="image/*" multiple onChange={e => handlePhotoSelect(e.target.files)}
                  disabled={photos.length >= 5} className="hidden" />
              </label>
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative group aspect-square">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover rounded-xl" />
                      <button onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 text-center">Photos are optional but help buyers make faster decisions</p>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Review Your Lot</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                {[
                  ['Crop', `${cropEmoji(form.crop)} ${form.crop} ${form.variety ? `• ${form.variety}` : ''}`],
                  ['Grade', `Grade ${form.grade}`],
                  ['Quantity', `${form.quantity} ${form.unit}`],
                  ['Expected Price', `₹${parseFloat(form.expected_price || '0').toLocaleString('en-IN')} per ${form.unit}`],
                  ['Total Value', `₹${(parseFloat(form.quantity || '0') * parseFloat(form.expected_price || '0')).toLocaleString('en-IN')}`],
                  ['Location', `${form.location_village ? form.location_village + ', ' : ''}${form.location_district}`],
                  ['Photos', `${photos.length} photo(s) uploaded`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-semibold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-700">
                  ℹ️ Your lot will be <strong>immediately listed</strong> and visible to verified buyers. You can edit or delete it from My Lots.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                className="flex-1 flex items-center justify-center gap-2 bg-[#2D7D32] hover:bg-[#1B5E20] text-white py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 shadow-md">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-[#2D7D32] hover:bg-[#1B5E20] text-white py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 shadow-md">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🌾 Create & List Lot'}
              </button>
            )}
          </div>
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}

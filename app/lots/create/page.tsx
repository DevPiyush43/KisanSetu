'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { CROPS, DISTRICTS, GRADES, UNITS } from '@/lib/types'
import { cropEmoji } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { calculateGrade, QualityParams } from '@/lib/services/quality-grading'
import { Upload, X, Check, ArrowLeft, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const STEPS = ['Crop Details', 'Quality Assessment', 'Quantity & Price', 'Photos', 'Review & Submit']

export default function CreateLotPage() {
  const supabase = createClient()
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [form, setForm] = useState({
    crop: '', variety: '', quality_notes: '',
    quantity: '', unit: 'quintal', expected_price: '',
    location_district: '', location_village: '', pickup_notes: '',
    // Quality fields
    moisture: '' as '' | 'low' | 'medium' | 'high',
    foreignMatter: '' as '' | 'low' | 'medium' | 'high',
    damage: '' as '' | 'none' | 'low' | 'medium' | 'high',
    harvest_date: '',
    storage_method: '' as '' | 'openAir' | 'covered' | 'coldStorage' | 'warehouse',
  })

  // Auto-calculate grade from quality params
  const qualityResult = useMemo(() => {
    if (!form.moisture || !form.foreignMatter || !form.damage || !form.storage_method) return null
    const daysSinceHarvest = form.harvest_date
      ? Math.max(0, Math.floor((Date.now() - new Date(form.harvest_date).getTime()) / 86400000))
      : 30
    const params: QualityParams = {
      moisture: form.moisture,
      foreignMatter: form.foreignMatter,
      damage: form.damage,
      daysSinceHarvest,
      storageMethod: form.storage_method,
    }
    return calculateGrade(params)
  }, [form.moisture, form.foreignMatter, form.damage, form.harvest_date, form.storage_method])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
        if (data?.district) setForm(f => ({ ...f, location_district: data.district, location_village: data.village ?? '' }))
        if (data?.primary_crops?.[0]) setForm(f => ({ ...f, crop: data.primary_crops[0] }))
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (step === 0) return !!form.crop
    if (step === 1) return !!form.moisture && !!form.foreignMatter && !!form.damage && !!form.harvest_date && !!form.storage_method
    if (step === 2) return !!form.quantity && !!form.expected_price && !!form.location_district
    if (step === 3) return photos.length >= 1
    return true
  }

  const handleSubmit = async () => {
    if (photos.length < 1) {
      toast.error(t('lot.photoRequired'))
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    // Ensure profile row exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!existingProfile) {
      const guessedRole = user.user_metadata?.role
        ?? (user.email?.includes('buyer') ? 'buyer'
          : user.email?.includes('admin') ? 'admin'
          : user.email?.includes('fpo') ? 'fpo_admin'
          : 'farmer')
      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: user.id,
        role: guessedRole,
        full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Farmer',
        language_pref: 'hi',
        trust_score: 50,
      })
      if (upsertErr) {
        toast.error('Could not create your profile. Please complete onboarding first.')
        setLoading(false)
        return
      }
    }

    // Upload photos
    const photoUrls: string[] = []
    for (const photo of photos) {
      const ext = photo.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('lot-photos').upload(path, photo)
      if (!error) photoUrls.push(path)
    }

    const grade = qualityResult?.grade ?? 'B'
    const qualityScore = qualityResult?.score ?? 50

    const baseLotPayload = {
      owner_id: user.id,
      crop: form.crop,
      variety: form.variety || null,
      grade,
      quantity: parseFloat(form.quantity),
      unit: form.unit,
      expected_price: parseFloat(form.expected_price),
      location_district: form.location_district,
      location_village: form.location_village || null,
      photos: photoUrls,
      pickup_notes: form.pickup_notes || null,
      status: 'listed' as const,
    }

    let lot: { id: string } | null = null
    let error: any = null

    // Try insert with quality fields
    const res1 = await supabase.from('lots').insert({
      ...baseLotPayload,
      moisture_content: form.moisture || null,
      foreign_matter: form.foreignMatter || null,
      damage_percent: form.damage || null,
      harvest_date: form.harvest_date || null,
      storage_method: form.storage_method || null,
      quality_score: qualityScore,
    }).select('id').single()

    if (res1.error) {
      // If error is missing columns in schema cache, fallback to core columns
      if (res1.error.message?.includes('schema cache') || res1.error.message?.includes('Could not find')) {
        const res2 = await supabase.from('lots').insert(baseLotPayload).select('id').single()
        lot = res2.data
        error = res2.error
      } else {
        error = res1.error
      }
    } else {
      lot = res1.data
    }

    if (error || !lot) {
      toast.error('Failed to create lot: ' + (error?.message ?? 'Unknown error'))
      setLoading(false)
      return
    }

    // Write ledger event (non-blocking)
    fetch('/api/ledger-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'lot_created',
        ref_id: lot.id,
        actor_id: user.id,
        payload: { crop: form.crop, quantity: form.quantity, district: form.location_district, grade, qualityScore }
      }),
    }).catch(() => {}) // ignore ledger failures

    toast.success('Lot created and listed successfully! 🌾')
    window.location.href = '/lots'
  }

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{t('lot.create')}</h1>

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
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('lot.crop')} *</label>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                  {CROPS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(fv => ({ ...fv, crop: c }))}
                      className={`flex flex-col items-center py-3 rounded-xl border-2 text-sm font-medium transition-all ${form.crop === c ? 'border-[#2D7D32] bg-[#2D7D32] text-white' : 'border-gray-200 hover:border-green-300 text-gray-700'}`}>
                      <span className="text-xl">{cropEmoji(c)}</span>
                      <span className="text-xs mt-1">{c}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('lot.variety')}</label>
                <input type="text" value={form.variety} onChange={e => setForm(fv => ({ ...fv, variety: e.target.value }))}
                  placeholder="e.g. Sharbati, Basmati 1121"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('lot.qualityNotes')}</label>
                <textarea value={form.quality_notes} onChange={e => setForm(fv => ({ ...fv, quality_notes: e.target.value }))}
                  rows={2} placeholder="e.g. Freshly harvested, low moisture, clean..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] resize-none" />
              </div>
            </div>
          )}

          {/* Step 1: Quality Assessment */}
          {step === 1 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">Answer these questions to get an automatic quality grade for your produce.</p>

              {/* Moisture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('lot.moistureContent')} *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map(v => (
                    <button key={v} type="button" onClick={() => setForm(fv => ({ ...fv, moisture: v }))}
                      className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-center ${form.moisture === v ? 'border-[#2D7D32] bg-[#F1F8E9] text-[#2D7D32]' : 'border-gray-200 text-gray-700 hover:border-green-300'}`}>
                      {t(`quality.moisture.${v}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Foreign Matter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('lot.foreignMatter')} *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map(v => (
                    <button key={v} type="button" onClick={() => setForm(fv => ({ ...fv, foreignMatter: v }))}
                      className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-center ${form.foreignMatter === v ? 'border-[#2D7D32] bg-[#F1F8E9] text-[#2D7D32]' : 'border-gray-200 text-gray-700 hover:border-green-300'}`}>
                      {t(`quality.foreignMatter.${v}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Damage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('lot.damagePercent')} *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['none', 'low', 'medium', 'high'] as const).map(v => (
                    <button key={v} type="button" onClick={() => setForm(fv => ({ ...fv, damage: v }))}
                      className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-center ${form.damage === v ? 'border-[#2D7D32] bg-[#F1F8E9] text-[#2D7D32]' : 'border-gray-200 text-gray-700 hover:border-green-300'}`}>
                      {t(`quality.damage.${v}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Harvest Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('lot.harvestDate')} *</label>
                <input type="date" value={form.harvest_date} onChange={e => setForm(fv => ({ ...fv, harvest_date: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
              </div>

              {/* Storage Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('lot.storageMethod')} *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['openAir', 'covered', 'coldStorage', 'warehouse'] as const).map(v => (
                    <button key={v} type="button" onClick={() => setForm(fv => ({ ...fv, storage_method: v }))}
                      className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-center ${form.storage_method === v ? 'border-[#2D7D32] bg-[#F1F8E9] text-[#2D7D32]' : 'border-gray-200 text-gray-700 hover:border-green-300'}`}>
                      {t(`quality.storage.${v}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-calculated Grade */}
              {qualityResult && (
                <div className={`${qualityResult.bgColor} border rounded-xl p-4 text-center`}>
                  <p className="text-xs text-gray-500 mb-1">{t('lot.autoGrade')}</p>
                  <p className={`text-2xl font-bold ${qualityResult.color}`}>{qualityResult.emoji} {qualityResult.grade}</p>
                  <div className="mt-2 flex items-center gap-2 justify-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-[#2D7D32] h-2 rounded-full transition-all" style={{ width: `${qualityResult.score}%` }} />
                    </div>
                    <span className="text-xs text-gray-600">{qualityResult.score}/100</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Quantity & Price */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('lot.quantity')} *</label>
                  <input type="number" value={form.quantity} onChange={e => setForm(fv => ({ ...fv, quantity: e.target.value }))}
                    min="0.1" step="0.1" placeholder="e.g. 100"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('lot.unit')}</label>
                  <select value={form.unit} onChange={e => setForm(fv => ({ ...fv, unit: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] bg-white">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('lot.expectedPrice')} (₹ per {form.unit}) *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('lot.district')} *</label>
                  <select value={form.location_district} onChange={e => setForm(fv => ({ ...fv, location_district: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] bg-white">
                    <option value="">Select district</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('lot.village')}</label>
                  <input type="text" value={form.location_village} onChange={e => setForm(fv => ({ ...fv, location_village: e.target.value }))}
                    placeholder="Your village"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('lot.pickupNotes')}</label>
                <textarea value={form.pickup_notes} onChange={e => setForm(fv => ({ ...fv, pickup_notes: e.target.value }))}
                  rows={2} placeholder="e.g. Available Mon-Sat 8am-6pm, contact before arriving"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] resize-none" />
              </div>
            </div>
          )}

          {/* Step 3: Photos */}
          {step === 3 && (
            <div className="space-y-4">
              <label
                className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${photos.length >= 5 ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-300 hover:border-[#2D7D32] hover:bg-green-50'}`}>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">{photos.length >= 5 ? 'Maximum 5 photos' : t('lot.uploadPhotos')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('lot.photoGuidelines')}</p>
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
              {photos.length === 0 && (
                <p className="text-xs text-amber-600 text-center bg-amber-50 rounded-lg p-2 border border-amber-200">
                  ⚠️ {t('lot.photoRequired')}
                </p>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">{t('lot.review')}</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                {[
                  [t('lot.crop'), `${cropEmoji(form.crop)} ${form.crop} ${form.variety ? `• ${form.variety}` : ''}`],
                  [t('lot.grade'), qualityResult ? `${qualityResult.emoji} ${qualityResult.grade} (Score: ${qualityResult.score}/100)` : 'B'],
                  [t('lot.quantity'), `${form.quantity} ${form.unit}`],
                  [t('lot.expectedPrice'), `₹${parseFloat(form.expected_price || '0').toLocaleString('en-IN')} per ${form.unit}`],
                  ['Total Value', `₹${(parseFloat(form.quantity || '0') * parseFloat(form.expected_price || '0')).toLocaleString('en-IN')}`],
                  [t('lot.district'), `${form.location_village ? form.location_village + ', ' : ''}${form.location_district}`],
                  [t('lot.harvestDate'), form.harvest_date || '—'],
                  [t('lot.storageMethod'), form.storage_method ? t(`quality.storage.${form.storage_method}`) : '—'],
                  [t('lot.photos'), `${photos.length} photo(s) uploaded`],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-center justify-between">
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
                <ArrowLeft className="w-4 h-4" /> {t('common.back')}
              </button>
            )}
            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                className="flex-1 flex items-center justify-center gap-2 bg-[#2D7D32] hover:bg-[#1B5E20] text-white py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 shadow-md">
                {t('common.next')} <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-[#2D7D32] hover:bg-[#1B5E20] text-white py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 shadow-md">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : `🌾 ${t('lot.createAndList')}`}
              </button>
            )}
          </div>
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}

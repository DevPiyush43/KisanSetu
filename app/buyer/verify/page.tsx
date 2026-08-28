'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import { Upload, CheckCircle, XCircle, Clock, Shield, FileText } from 'lucide-react'

export default function BuyerVerifyPage() {
  const supabase = createClient()
  const { t } = useTranslation()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    gst_number: '',
    pan_number: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc: '',
  })
  const [kycDoc, setKycDoc] = useState<File | null>(null)
  const [gstCert, setGstCert] = useState<File | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
        if (data) {
          setForm({
            gst_number: data.gst_number ?? '',
            pan_number: data.pan_number ?? '',
            bank_name: data.bank_name ?? '',
            bank_account_number: data.bank_account_number ?? '',
            bank_ifsc: data.bank_ifsc ?? '',
          })
        }
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const kycStatus = profile?.kyc_status ?? 'not_submitted'

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
    not_submitted: { icon: <FileText className="w-6 h-6" />, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', label: t('kyc.status.notSubmitted') },
    pending: { icon: <Clock className="w-6 h-6" />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: t('kyc.status.pending') },
    verified: { icon: <CheckCircle className="w-6 h-6" />, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: t('kyc.status.verified') },
    rejected: { icon: <XCircle className="w-6 h-6" />, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: t('kyc.status.rejected') },
  }

  const cfg = statusConfig[kycStatus] ?? statusConfig.not_submitted

  const handleSubmit = async () => {
    if (!form.gst_number || !form.pan_number || !form.bank_name || !form.bank_account_number || !form.bank_ifsc) {
      toast.error('Please fill all required fields')
      return
    }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    let business_registration_url = profile?.business_registration_url ?? null
    let gst_certificate_url = profile?.gst_certificate_url ?? null

    // Upload KYC doc
    if (kycDoc) {
      const ext = kycDoc.name.split('.').pop()
      const path = `kyc/${user.id}/business_reg.${ext}`
      const { error } = await supabase.storage.from('lot-photos').upload(path, kycDoc, { upsert: true })
      if (!error) business_registration_url = path
    }

    // Upload GST cert
    if (gstCert) {
      const ext = gstCert.name.split('.').pop()
      const path = `kyc/${user.id}/gst_cert.${ext}`
      const { error } = await supabase.storage.from('lot-photos').upload(path, gstCert, { upsert: true })
      if (!error) gst_certificate_url = path
    }

    let { error } = await supabase.from('profiles').update({
      gst_number: form.gst_number,
      pan_number: form.pan_number,
      bank_name: form.bank_name,
      bank_account_number: form.bank_account_number,
      bank_ifsc: form.bank_ifsc,
      business_registration_url,
      gst_certificate_url,
      kyc_status: 'pending',
    }).eq('id', user.id)

    if (error && (error.message?.includes('schema cache') || error.message?.includes('Could not find'))) {
      // Fallback update to standard columns
      const fb = await supabase.from('profiles').update({
        company_name: form.gst_number ? `GST: ${form.gst_number}` : profile?.company_name,
        kyc_doc_url: business_registration_url || gst_certificate_url,
      }).eq('id', user.id)
      error = fb.error
    }

    if (error) {
      toast.error('Failed to submit KYC: ' + error.message)
    } else {
      toast.success('KYC submitted for review! ✅')
      window.location.reload()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-[#2D7D32]" />
          <h1 className="text-2xl font-bold text-gray-800">{t('buyer.verifyKyc')}</h1>
        </div>

        {/* Status Banner */}
        <div className={`${cfg.bg} border rounded-2xl p-5 mb-6 flex items-center gap-4`}>
          <div className={cfg.color}>{cfg.icon}</div>
          <div>
            <p className={`font-bold text-lg ${cfg.color}`}>{cfg.label}</p>
            {kycStatus === 'rejected' && profile?.kyc_rejection_reason && (
              <p className="text-sm text-red-500 mt-1">Reason: {profile.kyc_rejection_reason}</p>
            )}
            {kycStatus === 'pending' && (
              <p className="text-sm text-amber-600 mt-1">Your documents are under review. This usually takes 24-48 hours.</p>
            )}
            {kycStatus === 'verified' && (
              <p className="text-sm text-green-600 mt-1">Your business is verified. You can now make offers to farmers.</p>
            )}
          </div>
        </div>

        {/* KYC Form */}
        {(kycStatus === 'not_submitted' || kycStatus === 'rejected') && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="font-semibold text-gray-800">Business Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('kyc.gstNumber')} *</label>
                <input type="text" value={form.gst_number} onChange={e => setForm(fv => ({ ...fv, gst_number: e.target.value.toUpperCase() }))}
                  placeholder="22ABCDE1234F1Z5" maxLength={15}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] uppercase" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('kyc.panNumber')} *</label>
                <input type="text" value={form.pan_number} onChange={e => setForm(fv => ({ ...fv, pan_number: e.target.value.toUpperCase() }))}
                  placeholder="ABCDE1234F" maxLength={10}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] uppercase" />
              </div>
            </div>

            <h2 className="font-semibold text-gray-800 pt-2">Bank Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('kyc.bankName')} *</label>
                <input type="text" value={form.bank_name} onChange={e => setForm(fv => ({ ...fv, bank_name: e.target.value }))}
                  placeholder="State Bank of India"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('kyc.accountNumber')} *</label>
                <input type="text" value={form.bank_account_number} onChange={e => setForm(fv => ({ ...fv, bank_account_number: e.target.value }))}
                  placeholder="1234567890"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('kyc.ifsc')} *</label>
                <input type="text" value={form.bank_ifsc} onChange={e => setForm(fv => ({ ...fv, bank_ifsc: e.target.value.toUpperCase() }))}
                  placeholder="SBIN0001234" maxLength={11}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] uppercase" />
              </div>
            </div>

            <h2 className="font-semibold text-gray-800 pt-2">Documents</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('kyc.businessReg')}</label>
                <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-[#2D7D32] hover:bg-green-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">{kycDoc?.name ?? 'Upload PDF/JPG'}</p>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setKycDoc(e.target.files?.[0] ?? null)} className="hidden" />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('kyc.gstCertificate')}</label>
                <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-[#2D7D32] hover:bg-green-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">{gstCert?.name ?? 'Upload PDF/JPG'}</p>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setGstCert(e.target.files?.[0] ?? null)} className="hidden" />
                </label>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading}
              className="w-full bg-[#2D7D32] hover:bg-[#1B5E20] text-white py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 shadow-md">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                `🔒 ${t('kyc.submitKyc')}`
              )}
            </button>
          </div>
        )}
      </main>
      <ChatWidget />
    </div>
  )
}

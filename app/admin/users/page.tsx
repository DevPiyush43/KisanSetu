'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { useTranslation } from '@/lib/i18n'
import { formatDate, getTrustScoreBg } from '@/lib/utils'
import { toast } from 'sonner'
import { Users, CheckCircle, XCircle, Clock, Shield } from 'lucide-react'

export default function AdminUsersPage() {
  const supabase = createClient()
  const { t } = useTranslation()
  const [profile, setProfile] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'farmer' | 'buyer' | 'fpo_admin' | 'pending_kyc'>('farmer')
  const [rejectDialog, setRejectDialog] = useState<{ userId: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
        fetchUsers('farmer')
        fetchPendingCount()
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPendingCount() {
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('kyc_status', 'pending')
    setPendingCount(count ?? 0)
  }

  async function fetchUsers(role: string) {
    setLoading(true)
    if (role === 'pending_kyc') {
      const { data } = await supabase.from('profiles').select('*').eq('kyc_status', 'pending').order('created_at', { ascending: false })
      setUsers(data ?? [])
    } else {
      const { data } = await supabase.from('profiles').select('*').eq('role', role).order('created_at', { ascending: false })
      setUsers(data ?? [])
    }
    setLoading(false)
  }

  const switchTab = (newTab: typeof tab) => {
    setTab(newTab)
    fetchUsers(newTab)
  }

  const toggleSuspend = async (userId: string, suspended: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_suspended: !suspended }).eq('id', userId)
    if (error) { toast.error('Failed to update'); return }
    toast.success(!suspended ? 'User suspended' : 'User unsuspended')
    fetchUsers(tab)
  }

  const approveKyc = async (userId: string) => {
    let { error } = await supabase.from('profiles').update({
      kyc_verified: true,
      kyc_status: 'verified',
      kyc_reviewed_at: new Date().toISOString(),
      kyc_reviewed_by: profile?.id,
    }).eq('id', userId)

    if (error && (error.message?.includes('schema cache') || error.message?.includes('Could not find'))) {
      const fb = await supabase.from('profiles').update({ kyc_verified: true }).eq('id', userId)
      error = fb.error
    }

    if (error) { toast.error('Failed to approve'); return }

    await fetch('/api/ledger-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'kyc_verified', ref_id: userId, actor_id: profile?.id, payload: { verified_user: userId } }),
    })
    toast.success('✅ KYC approved')
    fetchUsers(tab)
    fetchPendingCount()
  }

  const rejectKyc = async () => {
    if (!rejectDialog) return
    let { error } = await supabase.from('profiles').update({
      kyc_verified: false,
      kyc_status: 'rejected',
      kyc_rejection_reason: rejectReason || 'Documents insufficient',
      kyc_reviewed_at: new Date().toISOString(),
      kyc_reviewed_by: profile?.id,
    }).eq('id', rejectDialog.userId)

    if (error && (error.message?.includes('schema cache') || error.message?.includes('Could not find'))) {
      const fb = await supabase.from('profiles').update({ kyc_verified: false }).eq('id', rejectDialog.userId)
      error = fb.error
    }

    if (error) { toast.error('Failed to reject'); return }

    await fetch('/api/ledger-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'kyc_rejected', ref_id: rejectDialog.userId, actor_id: profile?.id, payload: { reason: rejectReason } }),
    })
    toast.success('KYC rejected')
    setRejectDialog(null)
    setRejectReason('')
    fetchUsers(tab)
    fetchPendingCount()
  }

  const kycBadge = (u: any) => {
    const status = u.kyc_status ?? (u.kyc_verified ? 'verified' : 'not_submitted')
    switch (status) {
      case 'verified': return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>
      case 'pending': return <span className="flex items-center gap-1 text-xs text-amber-600"><Clock className="w-3.5 h-3.5" /> Pending</span>
      case 'rejected': return <span className="flex items-center gap-1 text-xs text-red-600"><XCircle className="w-3.5 h-3.5" /> Rejected</span>
      default: return <span className="text-xs text-gray-400">—</span>
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-[#2D7D32]" /> {t('nav.users')}
        </h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {(['farmer', 'buyer', 'fpo_admin', 'pending_kyc'] as const).map(tabKey => (
            <button key={tabKey} onClick={() => switchTab(tabKey)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${tab === tabKey ? 'bg-[#2D7D32] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
              {tabKey === 'pending_kyc' && <Shield className="w-3.5 h-3.5" />}
              {tabKey === 'fpo_admin' ? 'FPO Admins'
               : tabKey === 'pending_kyc' ? `${t('admin.pendingKyc')}${pendingCount > 0 ? ` (${pendingCount})` : ''}`
               : tabKey.charAt(0).toUpperCase() + tabKey.slice(1) + 's'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {tab === 'pending_kyc' ? 'No pending KYC reviews 🎉' : `No ${tab}s found`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3">District</th>
                    <th className="text-left px-5 py-3">Trust</th>
                    <th className="text-left px-5 py-3">KYC</th>
                    {tab === 'pending_kyc' && <th className="text-left px-5 py-3">GST / PAN</th>}
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Joined</th>
                    <th className="text-left px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} className={`border-t border-gray-100 hover:bg-gray-50 ${i === 0 ? 'border-t-0' : ''}`}>
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-semibold text-gray-800">{u.full_name ?? u.company_name ?? 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{u.phone ?? u.role}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{u.district ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTrustScoreBg(u.trust_score ?? 50)}`}>
                          {u.trust_score ?? 50}
                        </span>
                      </td>
                      <td className="px-5 py-3">{kycBadge(u)}</td>
                      {tab === 'pending_kyc' && (
                        <td className="px-5 py-3 text-xs text-gray-500">
                          {u.gst_number && <span className="block">GST: {u.gst_number}</span>}
                          {u.pan_number && <span className="block">PAN: {u.pan_number}</span>}
                        </td>
                      )}
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {u.is_suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {(u.kyc_status === 'pending' || (!u.kyc_verified && tab === 'pending_kyc')) && (
                            <>
                              <button onClick={() => approveKyc(u.id)}
                                className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-lg hover:bg-green-200 font-medium">
                                ✓ {t('admin.approveKyc')}
                              </button>
                              <button onClick={() => setRejectDialog({ userId: u.id, name: u.full_name ?? 'User' })}
                                className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-200 font-medium">
                                ✗ {t('admin.rejectKyc')}
                              </button>
                            </>
                          )}
                          {!u.kyc_verified && u.kyc_status !== 'pending' && tab !== 'pending_kyc' && (
                            <button onClick={() => approveKyc(u.id)}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 font-medium">
                              ✓ Verify
                            </button>
                          )}
                          <button onClick={() => toggleSuspend(u.id, u.is_suspended)}
                            className={`text-xs px-2 py-1 rounded-lg font-medium ${u.is_suspended ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                            {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <ChatWidget />

      {/* Reject KYC Dialog */}
      {rejectDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRejectDialog(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">{t('admin.rejectKyc')}</h3>
            <p className="text-sm text-gray-500 mb-4">Reject KYC for <strong>{rejectDialog.name}</strong>?</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Rejection Reason</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                rows={3} placeholder="e.g. GST number does not match, documents are blurry..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRejectDialog(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">{t('common.cancel')}</button>
              <button onClick={rejectKyc}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm">
                Reject KYC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

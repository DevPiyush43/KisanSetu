'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { formatDate, getTrustScoreBg } from '@/lib/utils'
import { toast } from 'sonner'
import { Users, CheckCircle, XCircle, ShieldAlert } from 'lucide-react'

export default function AdminUsersPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'farmer' | 'buyer' | 'fpo_admin'>('farmer')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
        fetchUsers('farmer')
      }
    })
  }, [])

  async function fetchUsers(role: string) {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('role', role).order('created_at', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }

  const switchTab = (t: 'farmer' | 'buyer' | 'fpo_admin') => {
    setTab(t)
    fetchUsers(t)
  }

  const toggleSuspend = async (userId: string, suspended: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_suspended: !suspended }).eq('id', userId)
    if (error) { toast.error('Failed to update'); return }
    toast.success(!suspended ? 'User suspended' : 'User unsuspended')
    fetchUsers(tab)
  }

  const verifyKyc = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ kyc_verified: true }).eq('id', userId)
    if (error) { toast.error('Failed to verify'); return }

    await fetch('/api/ledger-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'kyc_verified', ref_id: userId, actor_id: profile?.id, payload: { verified_user: userId } }),
    })
    toast.success('KYC verified')
    fetchUsers(tab)
  }

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-[#2D7D32]" /> User Management
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(['farmer', 'buyer', 'fpo_admin'] as const).map(t => (
            <button key={t} onClick={() => switchTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-[#2D7D32] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
              {t === 'fpo_admin' ? 'FPO Admins' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No {tab}s found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3">District</th>
                    <th className="text-left px-5 py-3">Trust Score</th>
                    <th className="text-left px-5 py-3">KYC</th>
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
                          <p className="text-xs text-gray-400">{u.phone ?? '—'}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{u.district ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTrustScoreBg(u.trust_score ?? 50)}`}>
                          {u.trust_score ?? 50}/100
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {u.kyc_verified
                          ? <CheckCircle className="w-4 h-4 text-green-500" />
                          : <XCircle className="w-4 h-4 text-gray-300" />}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {u.is_suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          {!u.kyc_verified && (
                            <button onClick={() => verifyKyc(u.id)}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 font-medium">
                              ✓ Verify KYC
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
    </div>
  )
}

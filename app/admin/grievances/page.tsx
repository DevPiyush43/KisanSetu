'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'

export default function AdminGrievancesPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [grievances, setGrievances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [updating, setUpdating] = useState(false)
  const [filter, setFilter] = useState('open')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
        fetchGrievances('open')
      }
    })
  }, [])

  async function fetchGrievances(status: string) {
    setLoading(true)
    const q = supabase
      .from('grievances')
      .select('*, filer:profiles!grievances_filed_by_fkey(full_name, role, district)')
      .order('created_at', { ascending: false })
    const { data } = status === 'all' ? await q : await q.eq('status', status)
    setGrievances(data ?? [])
    setLoading(false)
  }

  const switchFilter = (f: string) => { setFilter(f); fetchGrievances(f) }

  const resolve = async (grievanceId: string, newStatus: 'resolved' | 'rejected') => {
    setUpdating(true)
    const { error } = await supabase
      .from('grievances')
      .update({ status: newStatus, admin_note: adminNote })
      .eq('id', grievanceId)

    if (error) { toast.error('Failed to update'); setUpdating(false); return }

    await fetch('/api/ledger-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: newStatus === 'resolved' ? 'grievance_resolved_in_favor' : 'grievance_rejected',
        ref_id: grievanceId,
        actor_id: profile?.id,
        payload: { status: newStatus, admin_note: adminNote }
      }),
    })

    toast.success(`Grievance ${newStatus}`)
    setSelected(null)
    setAdminNote('')
    setUpdating(false)
    fetchGrievances(filter)
  }

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-red-500" /> Grievances Queue
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[['open', '🔴 Open'], ['resolved', '🟢 Resolved'], ['rejected', '⚫ Rejected'], ['all', 'All']].map(([val, label]) => (
            <button key={val} onClick={() => switchFilter(val)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === val ? 'bg-[#2D7D32] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* List */}
          <div className="space-y-3">
            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-400">Loading...</div>
            ) : grievances.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-400">No grievances</div>
            ) : (
              grievances.map(g => (
                <button key={g.id} onClick={() => { setSelected(g); setAdminNote(g.admin_note ?? '') }}
                  className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 transition-all hover:shadow-md ${selected?.id === g.id ? 'border-[#2D7D32]' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{g.reason}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {g.filer?.full_name} ({g.filer?.role}) • {g.filer?.district}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.status === 'open' ? 'bg-red-100 text-red-700' : g.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {g.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(g.created_at)} • Contract #{g.contract_id?.slice(0, 8)}</p>
                </button>
              ))
            )}
          </div>

          {/* Detail */}
          <div>
            {selected ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 sticky top-24">
                <h2 className="font-bold text-gray-800 mb-4">Grievance Detail</h2>
                <div className="space-y-3 text-sm">
                  <div><p className="text-xs text-gray-400">Reason</p><p className="font-semibold">{selected.reason}</p></div>
                  <div><p className="text-xs text-gray-400">Description</p><p className="text-gray-700 leading-relaxed">{selected.description}</p></div>
                  <div><p className="text-xs text-gray-400">Filed by</p><p className="font-semibold">{selected.filer?.full_name} ({selected.filer?.role})</p></div>
                  <div><p className="text-xs text-gray-400">Filed on</p><p>{formatDate(selected.created_at)}</p></div>
                  {selected.evidence_url && (
                    <div><p className="text-xs text-gray-400">Evidence</p>
                      <a href="#" className="text-[#2D7D32] text-xs underline">View evidence</a>
                    </div>
                  )}
                </div>

                {selected.status === 'open' && (
                  <div className="mt-5 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Note</label>
                      <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                        rows={3} placeholder="Add your resolution note..."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] resize-none" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => resolve(selected.id, 'resolved')} disabled={updating}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">
                        <CheckCircle className="w-4 h-4" /> Resolve
                      </button>
                      <button onClick={() => resolve(selected.id, 'rejected')} disabled={updating}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-gray-500 hover:bg-gray-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                )}
                {selected.admin_note && (
                  <div className="mt-4 bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">Admin Note</p>
                    <p className="text-sm text-gray-700">{selected.admin_note}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 text-gray-400">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                Select a grievance to review
              </div>
            )}
          </div>
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}

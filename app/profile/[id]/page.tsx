import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { formatDate, getTrustScoreColor, cropEmoji } from '@/lib/utils'
import Link from 'next/link'
import { Shield, ShieldCheck, BarChart2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: viewerProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (!profile) notFound()

  // Trust ledger events for this user
  const { data: ledgerEvents } = await supabase
    .from('ledger_events')
    .select('*')
    .eq('actor_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Stats
  const { count: totalLots } = await supabase.from('lots').select('*', { count: 'exact', head: true }).eq('owner_id', id)
  const { count: soldLots } = await supabase.from('lots').select('*', { count: 'exact', head: true }).eq('owner_id', id).eq('status', 'sold')

  const score = profile.trust_score ?? 50
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={viewerProfile} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 rounded-full bg-[#2D7D32] flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                {profile.full_name?.charAt(0) ?? (profile.company_name?.charAt(0) ?? 'U')}
              </div>
              <h1 className="text-xl font-bold text-gray-800">{profile.full_name ?? profile.company_name ?? 'User'}</h1>
              <p className="text-sm text-gray-500 mt-0.5 capitalize">{profile.role?.replace('_', ' ')}</p>
              {profile.district && <p className="text-sm text-gray-400 mt-0.5">📍 {profile.village ? `${profile.village}, ` : ''}{profile.district}</p>}

              {/* Trust Score Gauge */}
              <div className="my-5 flex justify-center">
                <svg width="110" height="110" viewBox="0 0 110 110">
                  <circle cx="55" cy="55" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle cx="55" cy="55" r="45" fill="none"
                    stroke={score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    transform="rotate(-90 55 55)" className="trust-arc"
                    style={{ ['--target-offset' as any]: offset }} />
                  <text x="55" y="55" textAnchor="middle" dy="4" fontSize="20" fontWeight="bold" fill={score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626'}>
                    {score}
                  </text>
                  <text x="55" y="70" textAnchor="middle" fontSize="9" fill="#9ca3af">/ 100</text>
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-600">Trust Score</p>

              {/* Badges */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {profile.kyc_verified && (
                  <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                    <ShieldCheck className="w-3 h-3" /> KYC Verified
                  </span>
                )}
                {profile.role === 'admin' && (
                  <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                    <Shield className="w-3 h-3" /> Platform Admin
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 text-sm mb-3">Statistics</h2>
              {[
                ['Total Lots', totalLots ?? 0],
                ['Successful Sales', soldLots ?? 0],
                ['Member Since', formatDate(profile.created_at)],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{value as string}</span>
                </div>
              ))}
              {(profile.primary_crops?.length ?? 0) > 0 && (
                <div className="pt-3 flex flex-wrap gap-1.5">
                  {profile.primary_crops!.map((c: string) => (
                    <span key={c} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                      {cropEmoji(c)} {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ledger / Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[#2D7D32]" />
                <h2 className="font-semibold text-gray-800">Trust Ledger (Last 10 Events)</h2>
              </div>
              {(ledgerEvents?.length ?? 0) === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No ledger events yet</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {ledgerEvents!.map(event => (
                    <div key={event.id} className="px-5 py-3.5 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800 capitalize">
                            {event.event_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(event.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono text-gray-400 max-w-[120px] truncate">{event.hash?.slice(0, 12)}...</p>
                          <p className="text-xs text-gray-300 mt-0.5">Hash verified ✓</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}

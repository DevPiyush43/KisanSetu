import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { BarChart2, Package, HandshakeIcon, AlertCircle, Clock, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // KPI queries
  const [
    { count: activeLots },
    { count: totalUsers },
    { count: openGrievances },
    { data: recentContracts },
    { data: recentGrievances },
  ] = await Promise.all([
    supabase.from('lots').select('*', { count: 'exact', head: true }).in('status', ['listed', 'offer_received', 'negotiating']),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('grievances').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('contracts')
      .select('*, lot:lots(crop), farmer:profiles!contracts_farmer_id_fkey(full_name), buyer:profiles!contracts_buyer_id_fkey(company_name, full_name), payment:payments(status)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('grievances')
      .select('*, filer:profiles!grievances_filed_by_fkey(full_name, role)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: dealsThisWeek } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo)

  const kpis = [
    { label: 'Active Lots', value: activeLots ?? 0, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Deals This Week', value: dealsThisWeek ?? 0, icon: HandshakeIcon, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { label: 'Open Grievances', value: openGrievances ?? 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    { label: 'Total Users', value: totalUsers ?? 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  ]

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-[#2D7D32]" /> Admin Dashboard
        </h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`${bg} border ${border} rounded-2xl p-5`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-white`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-sm text-gray-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Contracts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Recent Contracts</h2>
              <Link href="/admin/grievances" className="text-xs text-[#2D7D32] hover:underline">View all →</Link>
            </div>
            <div>
              {(recentContracts ?? []).map((c: any, i: number) => {
                const payment = Array.isArray(c.payment) ? c.payment[0] : c.payment
                return (
                  <Link key={c.id} href={`/contracts/${c.id}`}
                    className={`flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {c.lot?.crop} — {c.farmer?.full_name} ↔ {c.buyer?.company_name ?? c.buyer?.full_name}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(c.created_at)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${payment?.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {payment?.status ?? 'pending'}
                    </span>
                  </Link>
                )
              })}
              {(recentContracts ?? []).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No contracts yet</p>
              )}
            </div>
          </div>

          {/* Open Grievances */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Open Grievances</h2>
              <Link href="/admin/grievances" className="text-xs text-[#2D7D32] hover:underline">Manage →</Link>
            </div>
            <div>
              {(recentGrievances ?? []).map((g: any, i: number) => (
                <Link key={g.id} href="/admin/grievances"
                  className={`flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{g.reason}</p>
                    <p className="text-xs text-gray-400">By {g.filer?.full_name} ({g.filer?.role}) • {formatDate(g.created_at)}</p>
                  </div>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Open</span>
                </Link>
              ))}
              {(recentGrievances ?? []).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No open grievances 🎉</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { href: '/admin/users', label: '👥 Manage Users', desc: 'Verify & suspend accounts' },
            { href: '/admin/grievances', label: '⚖️ Grievances Queue', desc: `${openGrievances ?? 0} open cases` },
          ].map(({ href, label, desc }) => (
            <Link key={href} href={href}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <p className="font-semibold text-gray-800 text-sm">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { Lot } from '@/lib/types'
import { formatCurrency, formatDate, cropEmoji, getStatusColor, getStatusLabel } from '@/lib/utils'
import Link from 'next/link'
import { Package, PlusCircle, Filter } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MyLotsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: lots } = await supabase
    .from('lots')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const stats = {
    total: lots?.length ?? 0,
    listed: lots?.filter(l => l.status === 'listed').length ?? 0,
    offer: lots?.filter(l => l.status === 'offer_received').length ?? 0,
    sold: lots?.filter(l => l.status === 'sold').length ?? 0,
  }

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-800">📦 My Lots</h1>
          <Link href="/lots/create"
            className="flex items-center gap-2 bg-[#2D7D32] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#1B5E20] transition-all shadow-md">
            <PlusCircle className="w-4 h-4" /> Create Lot
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'bg-gray-100 text-gray-700' },
            { label: 'Listed', value: stats.listed, color: 'bg-blue-100 text-blue-700' },
            { label: 'Offer Received', value: stats.offer, color: 'bg-amber-100 text-amber-700 badge-pulse' },
            { label: 'Sold', value: stats.sold, color: 'bg-green-100 text-green-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <p className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Lots list */}
        {(lots?.length ?? 0) === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Package className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No lots yet</p>
            <p className="text-sm text-gray-400 mb-5">Create your first lot to start selling to buyers</p>
            <Link href="/lots/create"
              className="inline-flex items-center gap-2 bg-[#2D7D32] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#1B5E20] transition-colors">
              <PlusCircle className="w-4 h-4" /> Create First Lot
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lots!.map((lot: Lot) => (
              <Link key={lot.id} href={`/lots/${lot.id}`}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all card-hover group">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{cropEmoji(lot.crop ?? '')}</div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getStatusColor(lot.status)} ${lot.status === 'offer_received' ? 'badge-pulse' : ''}`}>
                    {getStatusLabel(lot.status)}
                  </span>
                </div>
                <h3 className="font-bold text-gray-800 text-lg">{lot.crop}</h3>
                <p className="text-sm text-gray-500">{lot.variety} • Grade {lot.grade}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400">Quantity</p>
                    <p className="font-semibold text-gray-700">{lot.quantity} {lot.unit}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400">Expected Price</p>
                    <p className="font-semibold text-[#2D7D32]">{lot.expected_price ? formatCurrency(lot.expected_price) : '—'}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>📍 {lot.location_district}</span>
                  <span>{formatDate(lot.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <ChatWidget />
    </div>
  )
}

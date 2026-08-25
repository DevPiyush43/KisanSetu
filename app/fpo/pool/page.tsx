import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { formatDate, cropEmoji, getStatusColor } from '@/lib/utils'
import Link from 'next/link'
import { PlusCircle, HandshakeIcon } from 'lucide-react'
import { CreatePoolButton } from './create-pool-button'

export const dynamic = 'force-dynamic'

export default async function FpoPoolPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'fpo_admin') redirect('/dashboard')

  const { data: pools } = await supabase
    .from('fpo_pools')
    .select('*, lots(id, crop, quantity, unit, grade, location_district, owner:profiles(full_name))')
    .eq('fpo_admin_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <HandshakeIcon className="w-6 h-6 text-[#2D7D32]" /> FPO Pool Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Aggregate member lots to hit buyer minimum order quantities</p>
          </div>
          <CreatePoolButton userId={user.id} />
        </div>

        {(pools?.length ?? 0) === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <HandshakeIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No pools created yet</p>
            <p className="text-sm text-gray-400 mb-5">Create a pool to aggregate member lots into a single large listing</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pools!.map((pool: any) => {
              const lots = pool.lots ?? []
              const totalQty = lots.reduce((sum: number, l: any) => sum + (l.quantity ?? 0), 0)
              return (
                <div key={pool.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{cropEmoji(pool.crop)}</span>
                        <h2 className="font-bold text-gray-800 text-lg">{pool.name ?? `${pool.crop} Pool`}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(pool.status)}`}>{pool.status}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">Created {formatDate(pool.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#2D7D32]">{totalQty}</p>
                      <p className="text-xs text-gray-400">quintals total</p>
                    </div>
                  </div>

                  {lots.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                            <th className="text-left py-2">Farmer</th>
                            <th className="text-left py-2">Quantity</th>
                            <th className="text-left py-2">Grade</th>
                            <th className="text-left py-2">District</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lots.map((l: any) => (
                            <tr key={l.id} className="border-b border-gray-50 last:border-0">
                              <td className="py-2 font-medium text-gray-700">{l.owner?.full_name ?? 'Unknown'}</td>
                              <td className="py-2 text-gray-600">{l.quantity} {l.unit}</td>
                              <td className="py-2"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">Grade {l.grade}</span></td>
                              <td className="py-2 text-gray-500">{l.location_district}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">No lots added to this pool yet</p>
                  )}

                  {pool.status === 'open' && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                      <Link href={`/buyer/browse`}
                        className="flex-1 text-center py-2 bg-[#2D7D32] text-white rounded-xl text-sm font-semibold hover:bg-[#1B5E20] transition-colors">
                        List as Combined Lot
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
      <ChatWidget />
    </div>
  )
}

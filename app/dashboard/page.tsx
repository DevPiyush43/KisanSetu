import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import {
  TrendingUp, TrendingDown, Package, PlusCircle,
  Leaf, ShieldCheck, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import {
  formatCurrency, cropEmoji, getStatusColor,
  getStatusLabel, calculateForecast,
} from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let supabase: Awaited<ReturnType<typeof createClient>>

  try {
    supabase = await createClient()
  } catch {
    redirect('/login')
  }

  const { data: { user }, error: userError } = await supabase!.auth.getUser()
  if (userError || !user) redirect('/login')

  // Try to get profile; auto-create if missing
  let { data: profile } = await supabase!.from('profiles').select('*').eq('id', user.id).single()

  if (!profile) {
    const guessedRole = user.user_metadata?.role
      ?? (user.email?.includes('buyer') ? 'buyer'
        : user.email?.includes('admin') ? 'admin'
        : user.email?.includes('fpo') ? 'fpo_admin'
        : 'farmer')

    const { error: upsertErr } = await supabase!.from('profiles').upsert({
      id: user.id,
      role: guessedRole,
      full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
      language_pref: 'hi',
      trust_score: 50,
    })

    if (!upsertErr) {
      const { data: fresh } = await supabase!.from('profiles').select('*').eq('id', user.id).single()
      profile = fresh
    }
  }

  // Role-based redirect — dashboard is only for farmer / fpo_admin
  const role = profile?.role ?? user.user_metadata?.role ?? 'farmer'
  if (role === 'buyer') redirect('/buyer/browse')
  if (role === 'admin') redirect('/admin')
  if (role === 'fpo_admin') redirect('/fpo/pool')

  // Safe defaults when profile is still null (edge case)
  const primaryCrops: string[] = profile?.primary_crops ?? ['Wheat']
  const district: string = profile?.district ?? 'Indore'
  const displayName: string = profile?.full_name ?? user.email?.split('@')[0] ?? 'Farmer'
  const trustScore: number = profile?.trust_score ?? 50

  // Today's prices for primary crops
  const { data: todayPrices } = await supabase!
    .from('mandi_prices')
    .select('*')
    .in('crop', primaryCrops)
    .eq('district', district)
    .order('recorded_on', { ascending: false })
    .limit(primaryCrops.length * 3)

  // Deduplicate: one latest + one previous per crop
  const latestByKrop: Record<string, { price: number; prev: number }> = {}
  const seen = new Set<string>()
  for (const p of (todayPrices ?? [])) {
    if (!seen.has(p.crop)) {
      seen.add(p.crop)
      latestByKrop[p.crop] = { price: p.price_per_quintal, prev: 0 }
    } else if (latestByKrop[p.crop] && !latestByKrop[p.crop].prev) {
      latestByKrop[p.crop].prev = p.price_per_quintal
    }
  }

  // My lots
  const { data: myLots } = await supabase!
    .from('lots')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // AI Advisory for first crop
  const firstCrop = primaryCrops[0]
  const { data: priceSeries } = await supabase!
    .from('mandi_prices')
    .select('price_per_quintal')
    .eq('crop', firstCrop)
    .eq('district', district)
    .order('recorded_on', { ascending: true })
    .limit(14)

  const prices = priceSeries?.map(p => p.price_per_quintal) ?? []
  const advisory = prices.length >= 3 ? calculateForecast(firstCrop, district, prices) : null

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Welcome */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              नमस्ते, {displayName.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {district} • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-100">
            <ShieldCheck className="w-5 h-5 text-[#2D7D32]" />
            <div>
              <p className="text-xs text-gray-500">Trust Score</p>
              <p className="font-bold text-[#2D7D32]">{trustScore}/100</p>
            </div>
          </div>
        </div>

        {/* Price Cards */}
        {Object.keys(latestByKrop).length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Today&apos;s Prices in {district}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(latestByKrop).map(([crop, { price, prev }]) => {
                const up = prev > 0 ? price >= prev : true
                const pct = prev > 0 ? Math.abs(((price - prev) / prev) * 100).toFixed(1) : null
                return (
                  <Link key={crop} href="/prices"
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="text-2xl mb-1">{cropEmoji(crop)}</div>
                    <p className="text-sm font-semibold text-gray-700">{crop}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(price)}</p>
                    <p className="text-xs text-gray-400">per quintal</p>
                    {pct && (
                      <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
                        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {pct}% from yesterday
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* No prices fallback */}
        {Object.keys(latestByKrop).length === 0 && (
          <section className="mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
              <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-blue-700 font-medium text-sm">No price data yet for your crops in {district}</p>
              <Link href="/prices" className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                Browse all prices →
              </Link>
            </div>
          </section>
        )}

        {/* AI Advisory */}
        {advisory && (
          <section className="mb-8">
            <div className={`rounded-2xl p-5 border-2 shadow-sm ${advisory.recommendation === 'hold' ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300'}`}>
              <div className="flex items-start gap-3">
                <div className="text-3xl">{advisory.recommendation === 'hold' ? '🟢' : '🔴'}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-bold uppercase tracking-wide ${advisory.recommendation === 'hold' ? 'text-green-700' : 'text-amber-700'}`}>
                      AI Advisory for {firstCrop}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${advisory.recommendation === 'hold' ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}`}>
                      {advisory.recommendation === 'hold' ? '✅ HOLD' : '💰 SELL NOW'}
                    </span>
                    <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                      {Math.round(advisory.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1.5">{advisory.reason}</p>
                  <Link href="/prices" className="text-xs text-[#2D7D32] font-medium hover:underline mt-1 inline-block">
                    View full price chart →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/lots/create', icon: PlusCircle, label: 'Create Lot',  color: 'bg-[#2D7D32] text-white hover:bg-[#1B5E20]' },
              { href: '/lots',        icon: Package,    label: 'My Lots',     color: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200' },
              { href: '/prices',      icon: TrendingUp, label: 'View Prices', color: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200' },
              { href: '/offers',      icon: AlertCircle,label: 'Offers',      color: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200' },
            ].map(({ href, icon: Icon, label, color }) => (
              <Link key={href} href={href}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm ${color}`}>
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Lots */}
        {(myLots?.length ?? 0) > 0 ? (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Recent Lots</h2>
              <Link href="/lots" className="text-xs text-[#2D7D32] font-medium hover:underline">View all →</Link>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {myLots!.map((lot, i) => (
                <Link key={lot.id} href={`/lots/${lot.id}`}
                  className={`flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors ${i !== 0 ? 'border-t border-gray-100' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cropEmoji(lot.crop ?? '')}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{lot.crop} • {lot.quantity} {lot.unit}</p>
                      <p className="text-xs text-gray-400">{lot.location_district} • {lot.grade} grade</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(lot.status)}`}>
                      {getStatusLabel(lot.status)}
                    </span>
                    {lot.expected_price && (
                      <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(lot.expected_price)}/q</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Leaf className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No lots yet</p>
            <p className="text-sm text-gray-400 mb-4">Create your first lot to start selling</p>
            <Link href="/lots/create"
              className="inline-flex items-center gap-2 bg-[#2D7D32] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#1B5E20] transition-colors">
              <PlusCircle className="w-4 h-4" /> Create First Lot
            </Link>
          </div>
        )}

      </main>
      <ChatWidget />
    </div>
  )
}

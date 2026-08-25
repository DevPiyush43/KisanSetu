import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { formatCurrency, formatDate, cropEmoji, getStatusColor, getStatusLabel } from '@/lib/utils'
import Link from 'next/link'
import { FileText, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function OffersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isBuyer = profile?.role === 'buyer'

  // Fetch sent offers (buyer) or received offers (farmer)
  let offers: any[] = []
  if (isBuyer) {
    const { data } = await supabase
      .from('offers')
      .select('*, lot:lots(crop, variety, grade, quantity, unit, location_district, owner:profiles(full_name))')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
    offers = data ?? []
  } else {
    const { data } = await supabase
      .from('offers')
      .select('*, lot:lots(crop, variety, grade, quantity, unit, location_district), buyer:profiles(full_name, company_name, trust_score)')
      .eq('lots.owner_id', user.id)
      .order('created_at', { ascending: false })
    // Also query via lot ownership
    const { data: myLots } = await supabase.from('lots').select('id').eq('owner_id', user.id)
    const lotIds = (myLots ?? []).map((l: any) => l.id)
    if (lotIds.length > 0) {
      const { data: received } = await supabase
        .from('offers')
        .select('*, lot:lots(crop, variety, grade, quantity, unit, location_district), buyer:profiles(full_name, company_name, trust_score)')
        .in('lot_id', lotIds)
        .order('created_at', { ascending: false })
      offers = received ?? []
    }
  }

  const pendingOffers = offers.filter(o => o.status === 'pending')
  const otherOffers = offers.filter(o => o.status !== 'pending')

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {isBuyer ? '📋 My Offers' : '📨 Incoming Offers'}
        </h1>

        {offers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">{isBuyer ? 'No offers submitted yet' : 'No offers received yet'}</p>
            {isBuyer && (
              <Link href="/buyer/browse" className="text-sm text-[#2D7D32] hover:underline mt-2 inline-block">Browse lots →</Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {pendingOffers.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  Needs Action ({pendingOffers.length})
                </h2>
                <div className="space-y-3">
                  {pendingOffers.map(offer => <OfferCard key={offer.id} offer={offer} isBuyer={isBuyer} />)}
                </div>
              </section>
            )}
            {otherOffers.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Previous Offers</h2>
                <div className="space-y-3">
                  {otherOffers.map(offer => <OfferCard key={offer.id} offer={offer} isBuyer={isBuyer} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <ChatWidget />
    </div>
  )
}

function OfferCard({ offer, isBuyer }: { offer: any; isBuyer: boolean }) {
  const lot = offer.lot
  return (
    <Link href={`/lots/${offer.lot_id}`}
      className="block bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{cropEmoji(lot?.crop ?? '')}</span>
          <div>
            <p className="font-semibold text-gray-800">{lot?.crop} • {lot?.quantity} {lot?.unit}</p>
            <p className="text-xs text-gray-500">
              {isBuyer ? `Farmer: ${lot?.owner?.full_name ?? 'Farmer'}` : `Buyer: ${offer.buyer?.company_name ?? offer.buyer?.full_name ?? 'Buyer'}`}
              {' • '}{lot?.location_district}
            </p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getStatusColor(offer.status)}`}>
          {getStatusLabel(offer.status)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-400">Offer Price</p>
          <p className="font-bold text-[#2D7D32]">{formatCurrency(offer.price)}/q</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-400">Quantity</p>
          <p className="font-bold text-gray-700">{offer.quantity} q</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-400">Submitted</p>
          <p className="font-bold text-gray-700">{formatDate(offer.created_at)}</p>
        </div>
      </div>
      {offer.counter_price && (
        <p className="text-xs text-purple-600 mt-2 font-medium">Counter offer: {formatCurrency(offer.counter_price)}/q</p>
      )}
    </Link>
  )
}

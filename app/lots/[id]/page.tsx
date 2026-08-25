import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { formatCurrency, formatDate, cropEmoji, getStatusColor, getStatusLabel } from '@/lib/utils'
import Link from 'next/link'
import { OfferActions } from './offer-actions'
import { MakeOfferButton } from './make-offer-button'
import { ArrowLeft, MapPin, Calendar, Package, Tag, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: lot } = await supabase
    .from('lots')
    .select('*, owner:profiles(*)')
    .eq('id', id)
    .single()

  if (!lot) notFound()

  const isOwner = lot.owner_id === user.id
  const isBuyer = profile?.role === 'buyer'

  // Get offers if owner or buyer
  let offers: any[] = []
  if (isOwner) {
    const { data } = await supabase
      .from('offers')
      .select('*, buyer:profiles(full_name, company_name, trust_score, district)')
      .eq('lot_id', id)
      .order('created_at', { ascending: false })
    offers = data ?? []
  }

  // Get photo URLs
  const photoUrls = await Promise.all(
    (lot.photos ?? []).map(async (path: string) => {
      const { data } = await supabase.storage.from('lot-photos').createSignedUrl(path, 3600)
      return data?.signedUrl ?? null
    })
  )

  // Get logistics if sold
  let logistics: any[] = []
  if (lot.status === 'sold' && lot.location_district) {
    const { data } = await supabase
      .from('logistics_providers')
      .select('*')
      .eq('district', lot.location_district)
      .eq('is_active', true)
    logistics = data ?? []
  }

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link href={isOwner ? '/lots' : '/buyer/browse'}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">{cropEmoji(lot.crop ?? '')}</span>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800">{lot.crop}</h1>
                      {lot.variety && <p className="text-sm text-gray-500">{lot.variety}</p>}
                    </div>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full font-semibold ${getStatusColor(lot.status)}`}>
                    {getStatusLabel(lot.status)}
                  </span>
                </div>
                {lot.expected_price && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#2D7D32]">{formatCurrency(lot.expected_price)}</p>
                    <p className="text-sm text-gray-400">per {lot.unit}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Package, label: 'Quantity', value: `${lot.quantity} ${lot.unit}` },
                  { icon: Tag, label: 'Grade', value: `Grade ${lot.grade}` },
                  { icon: MapPin, label: 'Location', value: lot.location_district },
                  { icon: Calendar, label: 'Listed', value: formatDate(lot.created_at) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{value ?? '—'}</p>
                  </div>
                ))}
              </div>

              {lot.pickup_notes && (
                <div className="mt-4 text-sm text-gray-600 bg-blue-50 rounded-xl p-3">
                  📍 {lot.pickup_notes}
                </div>
              )}
            </div>

            {/* Photos */}
            {photoUrls.filter(Boolean).length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-3">Photos</h2>
                <div className="grid grid-cols-3 gap-3">
                  {photoUrls.filter(Boolean).map((url, i) => (
                    <img key={i} src={url!} alt={`Photo ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-xl" />
                  ))}
                </div>
              </div>
            )}

            {/* Logistics (only if sold) */}
            {logistics.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-4">🚛 Logistics & Storage Options</h2>
                <p className="text-xs text-gray-500 mb-3">Nearby providers in {lot.location_district}</p>
                <div className="space-y-2">
                  {logistics.map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{l.name}</p>
                        <p className="text-xs text-gray-500">{l.type === 'transporter' ? '🚛 Transporter' : l.type === 'cold_storage' ? '❄️ Cold Storage' : '🏭 Warehouse'} • {l.address}</p>
                      </div>
                      <a href={`tel:${l.contact_phone}`}
                        className="text-xs bg-[#2D7D32] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[#1B5E20]">
                        📞 Call
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Owner info */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-800 mb-3">Farmer Details</h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2D7D32] flex items-center justify-center text-white font-bold">
                  {lot.owner?.full_name?.charAt(0) ?? 'F'}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{lot.owner?.full_name ?? 'Farmer'}</p>
                  <p className="text-xs text-gray-500">{lot.owner?.district}</p>
                  <p className="text-xs text-[#2D7D32] font-medium">Trust Score: {lot.owner?.trust_score ?? 50}/100</p>
                </div>
              </div>
              <Link href={`/profile/${lot.owner_id}`}
                className="block w-full text-center mt-3 text-sm text-[#2D7D32] font-medium hover:underline">
                View Profile →
              </Link>
            </div>

            {/* Action for buyer */}
            {isBuyer && lot.status === 'listed' && (
              <MakeOfferButton lotId={lot.id} userId={user.id} expectedPrice={lot.expected_price} />
            )}

            {isBuyer && lot.status !== 'listed' && lot.status !== 'draft' && (
              <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                <p className="text-sm text-gray-600">This lot is <strong>{getStatusLabel(lot.status)}</strong> and not available for new offers.</p>
              </div>
            )}

            {/* Offers for owner */}
            {isOwner && offers.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-4">Incoming Offers ({offers.length})</h2>
                <OfferActions offers={offers} lotId={lot.id} userId={user.id} />
              </div>
            )}

            {isOwner && offers.length === 0 && lot.status === 'listed' && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-center">
                <Clock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-sm text-amber-700 font-medium">Waiting for offers</p>
                <p className="text-xs text-amber-600 mt-1">Buyers can see your lot and will send offers</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}

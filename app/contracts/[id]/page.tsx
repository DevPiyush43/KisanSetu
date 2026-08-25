import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { ChatWidget } from '@/components/chat/chat-widget'
import { formatCurrency, formatDate, cropEmoji, getStatusColor } from '@/lib/utils'
import Link from 'next/link'
import { FileText, Printer, AlertCircle } from 'lucide-react'
import { PaymentTracker } from './payment-tracker'

export const dynamic = 'force-dynamic'

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: contract } = await supabase
    .from('contracts')
    .select(`
      *,
      lot:lots(*),
      farmer:profiles!contracts_farmer_id_fkey(full_name, phone, village, district, trust_score),
      buyer:profiles!contracts_buyer_id_fkey(full_name, company_name, phone, district, trust_score),
      payment:payments(*)
    `)
    .eq('id', id)
    .single()

  if (!contract) notFound()

  // Logistics
  const { data: logistics } = await supabase
    .from('logistics_providers')
    .select('*')
    .eq('district', contract.lot?.location_district ?? '')
    .eq('is_active', true)

  const totalValue = (contract.final_price ?? 0) * (contract.final_quantity ?? 0)
  const payment = Array.isArray(contract.payment) ? contract.payment[0] : contract.payment

  return (
    <div className="min-h-screen bg-[#F1F8E9]">
      <Navbar profile={profile} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Print header (print-only) */}
        <div className="print-only mb-8 text-center border-b pb-4">
          <h1 className="text-3xl font-bold">KisanSetu</h1>
          <p className="text-sm text-gray-500">Agricultural Market Platform</p>
          <h2 className="text-xl font-bold mt-3">Digital Sale Contract</h2>
        </div>

        <div className="flex items-center justify-between mb-6 no-print flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#2D7D32]" /> Contract
            </h1>
            <p className="text-sm text-gray-500 font-mono mt-0.5">#{id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="flex gap-2 no-print">
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 shadow-sm">
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
            <Link href={`/grievances/new?contract=${id}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100">
              <AlertCircle className="w-4 h-4" /> File Grievance
            </Link>
          </div>
        </div>

        <div className="space-y-5">
          {/* Contract header */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              {[
                ['Contract Date', formatDate(contract.created_at)],
                ['Lot ID', contract.lot_id?.slice(0, 8).toUpperCase()],
                ['Status', 'Active'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-gray-400 text-xs">{label}</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: '🌾 Seller (Farmer)', data: contract.farmer, role: 'farmer' },
              { title: '🏭 Buyer', data: contract.buyer, role: 'buyer' },
            ].map(({ title, data }) => (
              <div key={title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-700 text-sm mb-3">{title}</h2>
                <p className="font-bold text-gray-800">{data?.company_name ?? data?.full_name ?? '—'}</p>
                {data?.district && <p className="text-sm text-gray-500">📍 {data.district}</p>}
                {data?.phone && <p className="text-sm text-gray-500">📞 {data.phone}</p>}
                <p className="text-xs text-[#2D7D32] font-medium mt-1">Trust Score: {data?.trust_score ?? 50}/100</p>
              </div>
            ))}
          </div>

          {/* Contract terms */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">Contract Terms</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                ['Crop', `${cropEmoji(contract.lot?.crop ?? '')} ${contract.lot?.crop ?? '—'}`],
                ['Variety', contract.lot?.variety ?? '—'],
                ['Grade', `Grade ${contract.lot?.grade ?? '—'}`],
                ['Quantity', `${contract.final_quantity} ${contract.lot?.unit ?? 'quintal'}`],
                ['Price per Quintal', formatCurrency(contract.final_price ?? 0)],
                ['Total Value', formatCurrency(totalValue)],
                ['Pickup Date', contract.terms?.pickup_date ?? '—'],
                ['Pickup Location', `${contract.lot?.location_village ?? ''}, ${contract.lot?.location_district ?? ''}`],
                ['Payment Terms', contract.terms?.payment_terms ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{value as string}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
              Contract signed: {formatDate(contract.created_at)} • KisanSetu Platform Contract ID: {id}
            </div>
          </div>

          {/* Payment Tracker */}
          {payment && (
            <PaymentTracker
              payment={payment}
              contractId={id}
              userId={user.id}
              isBuyer={contract.buyer_id === user.id}
              totalValue={totalValue}
            />
          )}

          {/* Logistics */}
          {(logistics?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-800 mb-4">🚛 Logistics & Storage</h2>
              <div className="space-y-2">
                {logistics!.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{l.name}</p>
                      <p className="text-xs text-gray-500">
                        {l.type === 'transporter' ? '🚛' : l.type === 'cold_storage' ? '❄️' : '🏭'}
                        {' '}{l.type.replace('_', ' ')} • {l.district}
                        {l.rate_per_km ? ` • ₹${l.rate_per_km}/km` : ''}
                        {l.capacity_tons ? ` • ${l.capacity_tons}T capacity` : ''}
                      </p>
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
      </main>
      <ChatWidget />
    </div>
  )
}

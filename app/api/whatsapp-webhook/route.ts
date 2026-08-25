import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// TODO(phase-2): Connect to WhatsApp Business Cloud API
// POST: receive WhatsApp webhook, GET: verification challenge

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? 'kisansetu-verify-2024'
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    // Extract message from WhatsApp webhook payload
    // TODO(phase-2): Parse real WhatsApp Business Cloud API format
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const message = change?.value?.messages?.[0]
    const text = message?.text?.body ?? ''
    const phone = message?.from ?? ''

    if (!text) return NextResponse.json({ status: 'no_message' })

    // Use shared handler
    const response = await handlePriceQuery(text, supabase)

    // TODO(phase-2): Send response via WhatsApp API
    console.log(`WhatsApp from ${phone}: "${text}" → "${response}"`)
    return NextResponse.json({ status: 'ok', response })
  } catch {
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}

async function handlePriceQuery(query: string, supabase: any): Promise<string> {
  const CROPS = ['Wheat', 'Paddy', 'Cotton', 'Soybean', 'Tomato']
  const DISTRICTS = ['Indore', 'Bhopal', 'Nagpur', 'Pune', 'Jaipur']
  const q = query.toLowerCase()
  const crop = CROPS.find(c => q.includes(c.toLowerCase())) ?? null
  const district = DISTRICTS.find(d => q.includes(d.toLowerCase())) ?? null

  if (!crop || !district) {
    return `KisanSetu: Please specify crop and mandi. Example: "Wheat price Indore"\nCrops: Wheat, Paddy, Cotton, Soybean, Tomato\nMandis: Indore, Bhopal, Nagpur, Pune, Jaipur`
  }

  const { data } = await supabase
    .from('mandi_prices')
    .select('price_per_quintal, recorded_on')
    .eq('crop', crop)
    .eq('district', district)
    .order('recorded_on', { ascending: false })
    .limit(1)
    .single()

  if (!data) return `No price data found for ${crop} in ${district} today.`
  return `KisanSetu 🌾\n${crop} in ${district}: ₹${data.price_per_quintal}/quintal\nDate: ${new Date(data.recorded_on).toLocaleDateString('en-IN')}\n\nVisit app.kisansetu.in for price trends & lot listing.`
}

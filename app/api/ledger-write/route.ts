import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { event_type, ref_id, actor_id, payload } = await request.json()
    const supabase = await createAdminClient()

    // Get the last hash in the chain
    const { data: lastEvent } = await supabase
      .from('ledger_events')
      .select('hash')
      .order('id', { ascending: false })
      .limit(1)
      .single()

    const prevHash = lastEvent?.hash ?? '0'.repeat(64)

    // Compute new hash: SHA256(prev_hash + JSON.stringify(payload))
    const hashInput = prevHash + JSON.stringify({ event_type, ref_id, actor_id, payload, timestamp: new Date().toISOString() })
    const hash = createHash('sha256').update(hashInput).digest('hex')

    // Insert ledger event
    const { data: newEvent, error } = await supabase
      .from('ledger_events')
      .insert({ event_type, ref_id, actor_id, payload, prev_hash: prevHash, hash })
      .select('id')
      .single()

    if (error) throw error

    // Update trust score based on event type
    // TODO(phase-2): Use sophisticated trust model with time decay and fraud detection
    if (actor_id) {
      const trustDeltas: Record<string, number> = {
        offer_accepted: 2,
        payment_paid: 3,
        payment_partial: 1,
        grievance_filed: -5,
        grievance_resolved_in_favor: 2,
        dispute_raised_against: -3,
        kyc_verified: 5,
        lot_sold: 2,
      }
      const delta = trustDeltas[event_type] ?? 0
      if (delta !== 0) {
        await supabase.rpc('increment_trust_score', { user_id: actor_id, delta })
          .catch(() => {
            // Fallback: manual update with bounds
            return supabase
              .from('profiles')
              .select('trust_score')
              .eq('id', actor_id)
              .single()
              .then(({ data }) => {
                if (data) {
                  const newScore = Math.max(0, Math.min(100, (data.trust_score ?? 50) + delta))
                  return supabase.from('profiles').update({ trust_score: newScore }).eq('id', actor_id)
                }
              })
          })
      }
    }

    return NextResponse.json({ success: true, event_id: newEvent.id, hash })
  } catch (error) {
    console.error('Ledger write error:', error)
    return NextResponse.json({ error: 'Failed to write ledger event' }, { status: 500 })
  }
}

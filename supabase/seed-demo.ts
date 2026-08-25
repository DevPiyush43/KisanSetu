#!/usr/bin/env tsx
/**
 * KisanSetu Demo Data Seeder
 * Creates demo auth users + profiles + lots + offers + contracts
 * 
 * Run: npx tsx supabase/seed-demo.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const DEMO_PASSWORD = 'Demo@1234'

const farmers = [
  { email: 'farmer1@kisansetu.demo', name: 'Ramesh Kumar', phone: '9876543201', village: 'Pithampur', district: 'Indore', crops: ['Wheat', 'Soybean'] },
  { email: 'farmer2@kisansetu.demo', name: 'Sunita Devi', phone: '9876543202', village: 'Mandideep', district: 'Bhopal', crops: ['Paddy', 'Wheat'] },
  { email: 'farmer3@kisansetu.demo', name: 'Mohan Patel', phone: '9876543203', village: 'Butibori', district: 'Nagpur', crops: ['Cotton', 'Soybean'] },
  { email: 'farmer4@kisansetu.demo', name: 'Priya Singh', phone: '9876543204', village: 'Ranjangaon', district: 'Pune', crops: ['Tomato'] },
  { email: 'farmer5@kisansetu.demo', name: 'Kishan Lal', phone: '9876543205', village: 'Sitapura', district: 'Jaipur', crops: ['Wheat', 'Cotton'] },
  { email: 'farmer6@kisansetu.demo', name: 'Geeta Rao', phone: '9876543206', village: 'Lasudia', district: 'Indore', crops: ['Soybean'] },
  { email: 'farmer7@kisansetu.demo', name: 'Suresh Yadav', phone: '9876543207', village: 'Kamptee', district: 'Nagpur', crops: ['Paddy'] },
  { email: 'farmer8@kisansetu.demo', name: 'Anita Verma', phone: '9876543208', village: 'Chakan', district: 'Pune', crops: ['Tomato', 'Soybean'] },
  { email: 'farmer9@kisansetu.demo', name: 'Vijay Sharma', phone: '9876543209', village: 'Muhana', district: 'Jaipur', crops: ['Wheat'] },
  { email: 'farmer10@kisansetu.demo', name: 'Lakshmi Bai', phone: '9876543210', village: 'Bairagarh', district: 'Bhopal', crops: ['Cotton', 'Paddy'] },
]

const fpoAdmins = [
  { email: 'fpo1@kisansetu.demo', name: 'FPO Madhya Pradesh Kisan Samiti', phone: '9800000001', village: 'Indore', district: 'Indore', crops: ['Wheat', 'Soybean'] },
]

const buyers = [
  { email: 'buyer1@kisansetu.demo', name: 'Agro Processing Pvt Ltd', phone: '9900000001', buyerType: 'processor', districts: ['Indore', 'Bhopal'] },
  { email: 'buyer2@kisansetu.demo', name: 'National Grain Traders', phone: '9900000002', buyerType: 'trader', districts: ['Nagpur', 'Pune'] },
  { email: 'buyer3@kisansetu.demo', name: 'FoodCorp Institutional', phone: '9900000003', buyerType: 'institutional', districts: ['Jaipur', 'Indore'] },
  { email: 'buyer4@kisansetu.demo', name: 'Cotton Mills India', phone: '9900000004', buyerType: 'processor', districts: ['Nagpur', 'Jaipur'] },
  { email: 'buyer5@kisansetu.demo', name: 'Fresh Veggies Network', phone: '9900000005', buyerType: 'trader', districts: ['Pune', 'Bhopal'] },
]

const admins = [
  { email: 'admin@kisansetu.demo', name: 'Platform Admin', phone: '9000000000' },
]

async function createUser(email: string, name: string, role: string, extraProfile: Record<string, unknown> = {}) {
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })
  
  if (authError) {
    if (authError.message.toLowerCase().includes('already registered') || authError.message.toLowerCase().includes('already been registered')) {
      const { data: existing } = await supabase.auth.admin.listUsers()
      const user = existing?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (user) {
        await supabase.auth.admin.updateUserById(user.id, {
          password: DEMO_PASSWORD,
          email_confirm: true,
        })
        await supabase.from('profiles').upsert({
          id: user.id,
          role,
          full_name: name,
          trust_score: 50 + Math.floor(Math.random() * 40),
          ...extraProfile,
        })
        console.log(`  🔄 Updated existing user ${email}`)
        return user.id
      }
    }
    console.error(`  ❌ Error creating ${email}:`, authError.message)
    return null
  }

  const userId = authData.user!.id

  // Create profile
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    role,
    full_name: name,
    trust_score: 50 + Math.floor(Math.random() * 40),
    ...extraProfile,
  })

  if (profileError) {
    console.error(`  ❌ Error creating profile for ${email}:`, profileError.message)
  }

  return userId
}

async function main() {
  console.log('🌱 KisanSetu Demo Data Seeder\n')
  
  const farmerIds: string[] = []
  const buyerIds: string[] = []
  let adminId: string | null = null

  // Create farmers
  console.log('👨‍🌾 Creating farmers...')
  for (const f of farmers) {
    const id = await createUser(f.email, f.name, 'farmer', {
      phone: f.phone, village: f.village, district: f.district,
      primary_crops: f.crops, language_pref: 'hi'
    })
    if (id) { farmerIds.push(id); console.log(`  ✅ ${f.name} (${f.email})`) }
  }

  // Create FPO admin
  console.log('\n🤝 Creating FPO admins...')
  for (const f of fpoAdmins) {
    const id = await createUser(f.email, f.name, 'fpo_admin', {
      phone: f.phone, village: f.village, district: f.district,
      primary_crops: f.crops, language_pref: 'hi'
    })
    if (id) { farmerIds.push(id); console.log(`  ✅ ${f.name} (${f.email})`) }
  }

  // Create buyers
  console.log('\n🏭 Creating buyers...')
  for (const b of buyers) {
    const id = await createUser(b.email, b.name, 'buyer', {
      phone: b.phone, company_name: b.name, buyer_type: b.buyerType,
      operating_districts: b.districts, kyc_verified: true
    })
    if (id) { buyerIds.push(id); console.log(`  ✅ ${b.name} (${b.email})`) }
  }

  // Create admin
  console.log('\n👑 Creating admin...')
  for (const a of admins) {
    adminId = await createUser(a.email, a.name, 'admin', { phone: a.phone, trust_score: 100 })
    if (adminId) console.log(`  ✅ ${a.name} (${a.email})`)
  }

  // Create lots
  if (farmerIds.length > 0) {
    console.log('\n📦 Creating lots...')
    
    const lotData = [
      { crop: 'Wheat', variety: 'Sharbati', grade: 'Premium', quantity: 150, unit: 'quintal', expected_price: 2350, location_district: 'Indore', location_village: 'Pithampur', status: 'listed', owner_index: 0 },
      { crop: 'Paddy', variety: 'Basmati 1121', grade: 'A', quantity: 80, unit: 'quintal', expected_price: 2150, location_district: 'Bhopal', location_village: 'Mandideep', status: 'listed', owner_index: 1 },
      { crop: 'Cotton', variety: 'Bt Cotton', grade: 'A', quantity: 200, unit: 'quintal', expected_price: 6200, location_district: 'Nagpur', location_village: 'Butibori', status: 'offer_received', owner_index: 2 },
      { crop: 'Tomato', variety: 'Hybrid', grade: 'B', quantity: 50, unit: 'quintal', expected_price: 1400, location_district: 'Pune', location_village: 'Ranjangaon', status: 'negotiating', owner_index: 3 },
      { crop: 'Wheat', variety: 'Raj 4120', grade: 'A', quantity: 100, unit: 'quintal', expected_price: 2280, location_district: 'Jaipur', location_village: 'Sitapura', status: 'sold', owner_index: 4 },
      { crop: 'Soybean', variety: 'JS 335', grade: 'A', quantity: 75, unit: 'quintal', expected_price: 4650, location_district: 'Indore', location_village: 'Lasudia', status: 'listed', owner_index: 5 },
      { crop: 'Paddy', variety: 'IR-36', grade: 'B', quantity: 120, unit: 'quintal', expected_price: 1950, location_district: 'Nagpur', location_village: 'Kamptee', status: 'draft', owner_index: 6 },
      { crop: 'Tomato', variety: 'Cherry', grade: 'Premium', quantity: 30, unit: 'quintal', expected_price: 2200, location_district: 'Pune', location_village: 'Chakan', status: 'sold', owner_index: 7 },
      { crop: 'Wheat', variety: 'GW 322', grade: 'C', quantity: 200, unit: 'quintal', expected_price: 2100, location_district: 'Jaipur', location_village: 'Muhana', status: 'expired', owner_index: 8 },
      { crop: 'Cotton', variety: 'DCH-32', grade: 'Premium', quantity: 90, unit: 'quintal', expected_price: 6800, location_district: 'Bhopal', location_village: 'Bairagarh', status: 'listed', owner_index: 9 },
      { crop: 'Soybean', variety: 'Pusa 16', grade: 'A', quantity: 60, unit: 'quintal', expected_price: 4800, location_district: 'Indore', location_village: 'Pithampur', status: 'listed', owner_index: 0 },
      { crop: 'Wheat', variety: 'HD 2967', grade: 'A', quantity: 180, unit: 'quintal', expected_price: 2320, location_district: 'Bhopal', location_village: 'Mandideep', status: 'offer_received', owner_index: 1 },
      { crop: 'Paddy', variety: 'MTU 1010', grade: 'B', quantity: 95, unit: 'quintal', expected_price: 1980, location_district: 'Nagpur', location_village: 'Butibori', status: 'listed', owner_index: 2 },
      { crop: 'Tomato', variety: 'Arka Rakshak', grade: 'A', quantity: 45, unit: 'quintal', expected_price: 1600, location_district: 'Pune', location_village: 'Ranjangaon', status: 'draft', owner_index: 3 },
      { crop: 'Cotton', variety: 'RCH 134', grade: 'B', quantity: 110, unit: 'quintal', expected_price: 5900, location_district: 'Jaipur', location_village: 'Sitapura', status: 'listed', owner_index: 4 },
    ]

    const lotIds: string[] = []
    for (const lot of lotData) {
      const ownerId = farmerIds[lot.owner_index % farmerIds.length]
      const { data, error } = await supabase.from('lots').insert({
        owner_id: ownerId,
        crop: lot.crop, variety: lot.variety, grade: lot.grade,
        quantity: lot.quantity, unit: lot.unit,
        expected_price: lot.expected_price,
        location_district: lot.location_district,
        location_village: lot.location_village,
        status: lot.status,
        pickup_notes: 'Available for pickup Mon-Sat 8am-6pm',
      }).select('id').single()

      if (error) {
        console.error(`  ❌ Error creating lot ${lot.crop}:`, error.message)
      } else {
        lotIds.push(data.id)
        console.log(`  ✅ Lot: ${lot.crop} - ${lot.quantity} ${lot.unit} (${lot.status})`)
      }
    }

    // Create offers for offer_received and sold lots
    if (buyerIds.length > 0 && lotIds.length >= 5) {
      console.log('\n📋 Creating offers...')
      
      // Offer on lot index 2 (Cotton, offer_received)
      const { data: offer1 } = await supabase.from('offers').insert({
        lot_id: lotIds[2], buyer_id: buyerIds[3],
        price: 6000, quantity: 150, pickup_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
        note: 'Interested in bulk purchase. Can arrange own transport.',
        status: 'pending',
      }).select('id').single()
      if (offer1) console.log('  ✅ Offer on Cotton lot (pending)')

      // Offer on lot index 3 (Tomato, negotiating)
      const { data: offer2 } = await supabase.from('offers').insert({
        lot_id: lotIds[3], buyer_id: buyerIds[4],
        price: 1200, quantity: 40, pickup_date: new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0],
        note: 'Urgent requirement for restaurant chain.',
        status: 'countered', counter_price: 1350,
      }).select('id').single()
      if (offer2) console.log('  ✅ Offer on Tomato lot (countered)')

      // Create contract + payment for sold lots
      for (const lotIdx of [4, 7]) {
        if (lotIds[lotIdx]) {
          const ownerId = farmerIds[lotData[lotIdx].owner_index % farmerIds.length]
          const buyerId = buyerIds[lotIdx % buyerIds.length]
          const finalPrice = lotData[lotIdx].expected_price * 0.96
          const finalQty = lotData[lotIdx].quantity * 0.9

          const { data: offer } = await supabase.from('offers').insert({
            lot_id: lotIds[lotIdx], buyer_id: buyerId,
            price: finalPrice, quantity: finalQty,
            pickup_date: new Date(Date.now() - 2*24*60*60*1000).toISOString().split('T')[0],
            status: 'accepted',
          }).select('id').single()

          if (offer) {
            const { data: contract } = await supabase.from('contracts').insert({
              offer_id: offer.id, lot_id: lotIds[lotIdx],
              farmer_id: ownerId, buyer_id: buyerId,
              final_price: finalPrice, final_quantity: finalQty,
              terms: {
                crop: lotData[lotIdx].crop, grade: lotData[lotIdx].grade,
                pickup_location: lotData[lotIdx].location_village + ', ' + lotData[lotIdx].location_district,
                payment_terms: '50% advance, 50% on delivery',
                signed_at: new Date().toISOString(),
              }
            }).select('id').single()

            if (contract) {
              const totalAmount = finalPrice * finalQty
              const isPaid = lotIdx === 7
              await supabase.from('payments').insert({
                contract_id: contract.id,
                status: isPaid ? 'paid' : 'partially_paid',
                amount_paid: isPaid ? totalAmount : totalAmount * 0.5,
                total_amount: totalAmount,
              })
              console.log(`  ✅ Contract + Payment for ${lotData[lotIdx].crop} lot (${isPaid ? 'paid' : 'partially_paid'})`)
            }
          }
        }
      }
    }
  }

  console.log('\n' + '═'.repeat(60))
  console.log('✅ KisanSetu demo data seeded successfully!\n')
  console.log('📋 Demo Credentials:')
  console.log('─'.repeat(60))
  console.log('👨‍🌾 Farmers:')
  farmers.forEach(f => console.log(`   ${f.email} / ${DEMO_PASSWORD}`))
  console.log('\n🤝 FPO Admin:')
  fpoAdmins.forEach(f => console.log(`   ${f.email} / ${DEMO_PASSWORD}`))
  console.log('\n🏭 Buyers:')
  buyers.forEach(b => console.log(`   ${b.email} / ${DEMO_PASSWORD}`))
  console.log('\n👑 Admin:')
  admins.forEach(a => console.log(`   ${a.email} / ${DEMO_PASSWORD}`))
  console.log('═'.repeat(60))
}

main().catch(console.error)

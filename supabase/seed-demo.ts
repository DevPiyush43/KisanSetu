// Seed data demo script
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function seed() {
  console.log('Seeding demo data...')
  
  // Example seed logic here
  // Would create auth users, profiles, etc.
  
  console.log('Demo credentials:')
  console.log('Farmer: farmer1@kisansetu.demo / Demo@1234')
  console.log('Buyer: buyer1@kisansetu.demo / Demo@1234')
  console.log('Admin: admin@kisansetu.demo / Demo@1234')
}

seed().catch(console.error)

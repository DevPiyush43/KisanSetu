import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey || serviceKey.includes('your-service-role-key')) {
      // Service key not configured yet, notify client to use fallback
      return NextResponse.json({ useFallback: true })
    }

    const supabaseAdmin = await createAdminClient()

    // Create user with email_confirm: true via admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role },
    })

    if (createError) {
      // If user already exists, check if email is unconfirmed and confirm it
      if (createError.message.toLowerCase().includes('already registered')) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (existingUser) {
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { email_confirm: true })
          return NextResponse.json({ success: true, message: 'User updated and email confirmed' })
        }
      }
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Ensure profile row exists in profiles table
    if (userData.user) {
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: userData.user.id,
        role: role,
        language_pref: 'hi',
        trust_score: 50,
      })

      if (profileError) {
        console.error('Profile creation error:', profileError)
      }
    }

    return NextResponse.json({ success: true, user: userData.user })
  } catch (err: any) {
    console.error('Signup API error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create user' }, { status: 500 })
  }
}

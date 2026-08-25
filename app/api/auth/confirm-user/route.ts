import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey || serviceKey.includes('your-service-role-key')) {
      return NextResponse.json({
        error: 'Service Role Key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in .env.local or disable "Confirm Email" in Supabase Dashboard (Auth -> Providers -> Email -> Confirm email: OFF).'
      }, { status: 400 })
    }

    const supabaseAdmin = await createAdminClient()

    // Find user by email
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 400 })
    }

    const targetUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Confirm email for this user
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      email_confirm: true,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Email confirmed successfully! You can now log in.' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to confirm email' }, { status: 500 })
  }
}

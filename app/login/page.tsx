'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, Info } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setEmailNotConfirmed(false)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setEmailNotConfirmed(true)
          // Try auto-confirming automatically via admin API endpoint
          const confirmRes = await fetch('/api/auth/confirm-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          })
          const confirmData = await confirmRes.json()

          if (confirmRes.ok && confirmData.success) {
            // Retry login
            const { data: retryData, error: retryErr } = await supabase.auth.signInWithPassword({ email, password })
            if (!retryErr && retryData.user) {
              toast.success('Email confirmed & logged in!')
              await redirectByRole(retryData.user.id)
              return
            }
          }

          toast.error('Email not confirmed yet. Click "Auto-Confirm Email" below or check your inbox.')
          setLoading(false)
          return
        }

        toast.error(error.message)
        setLoading(false)
        return
      }

      if (data.user) {
        toast.success('Sign in successful!')
        await redirectByRole(data.user.id)
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
      setLoading(false)
    }
  }

  const redirectByRole = async (userId: string) => {
    try {
      // 1. Fetch user profile
      let { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()

      // 2. If profile is missing, automatically upsert default profile
      if (!profile) {
        const defaultRole = email.includes('buyer') ? 'buyer' : email.includes('admin') ? 'admin' : email.includes('fpo') ? 'fpo_admin' : 'farmer'
        await supabase.from('profiles').upsert({
          id: userId,
          role: defaultRole,
          full_name: email.split('@')[0],
          language_pref: 'hi',
          trust_score: 50,
        })
        profile = { role: defaultRole }
      }

      const role = profile?.role ?? 'farmer'
      const dest = role === 'buyer' ? '/buyer/browse' : role === 'admin' ? '/admin' : '/dashboard'
      
      // Perform full browser navigation so cookies are 100% refreshed across server components
      window.location.href = dest
    } catch (err) {
      console.error('Redirect error:', err)
      window.location.href = '/dashboard'
    }
  }

  const handleAutoConfirm = async () => {
    if (!email) { toast.error('Please enter your email address'); return }
    setLoading(true)
    const res = await fetch('/api/auth/confirm-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()

    if (res.ok && data.success) {
      if (password) {
        const { data: loginData, error } = await supabase.auth.signInWithPassword({ email, password })
        if (!error && loginData.user) {
          toast.success('Email confirmed & logged in!')
          await redirectByRole(loginData.user.id)
          return
        }
      }
      toast.success('Email confirmed! You can now log in.')
      setEmailNotConfirmed(false)
      setLoading(false)
    } else {
      toast.error(data.error || 'Auto-confirm failed. Check SUPABASE_SERVICE_ROLE_KEY or disable "Confirm Email" in Supabase Auth Settings.')
      setLoading(false)
    }
  }

  const demoLogins = [
    { label: '🌾 Farmer', email: 'farmer1@kisansetu.demo' },
    { label: '🏭 Buyer', email: 'buyer1@kisansetu.demo' },
    { label: '👑 Admin', email: 'admin@kisansetu.demo' },
    { label: '🤝 FPO', email: 'fpo1@kisansetu.demo' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B5E20] via-[#2D7D32] to-[#388E3C] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full mb-3 hover:bg-white/20 transition-all">
            <Leaf className="w-5 h-5 text-[#F9A825]" />
            <span className="text-white font-bold text-lg">KisanSetu</span>
          </Link>
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-green-200 mt-1 text-sm">Sign in to access your marketplace dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {emailNotConfirmed && (
            <div className="mb-5 p-4 bg-amber-50 rounded-xl border border-amber-300 space-y-3">
              <div className="flex items-start gap-2 text-amber-900 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Email not confirmed in Supabase!</strong> Click below to auto-confirm this account instantly for testing/demo.
                </span>
              </div>
              <button type="button" onClick={handleAutoConfirm} disabled={loading}
                className="w-full bg-[#F9A825] hover:bg-amber-500 text-[#1B5E20] text-xs font-bold py-2.5 rounded-lg transition-all shadow-sm">
                ⚡ Auto-Confirm Email & Log In Now
              </button>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] focus:border-transparent transition-all" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] focus:border-transparent transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full bg-[#2D7D32] hover:bg-[#1B5E20] text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[#2D7D32] font-semibold hover:underline">Sign up</Link>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-xs font-semibold text-amber-800 mb-2">🎯 Quick Demo Logins (password: Demo@1234)</p>
            <div className="grid grid-cols-2 gap-1.5">
              {demoLogins.map(d => (
                <button key={d.email} type="button"
                  onClick={() => { setEmail(d.email); setPassword('Demo@1234'); setEmailNotConfirmed(false); }}
                  className="text-xs bg-white border border-amber-200 hover:border-amber-400 text-amber-800 px-2 py-1.5 rounded-lg text-left hover:bg-amber-50 transition-colors">
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Splash Info Link */}
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Learn more about KisanSetu Platform
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

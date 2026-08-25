'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  Eye, EyeOff, Mail, Lock, ArrowRight,
  AlertCircle, Info, ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'

const DEMO_LOGINS = [
  { label: '🌾 Farmer',   email: 'farmer1@kisansetu.demo', role: 'farmer' },
  { label: '🏭 Buyer',    email: 'buyer1@kisansetu.demo',  role: 'buyer' },
  { label: '👑 Admin',    email: 'admin@kisansetu.demo',   role: 'admin' },
  { label: '🤝 FPO',      email: 'fpo1@kisansetu.demo',   role: 'fpo_admin' },
]

function roleToDestination(role: string): string {
  if (role === 'buyer')     return '/buyer/browse'
  if (role === 'admin')     return '/admin'
  if (role === 'fpo_admin') return '/fpo/pool'
  return '/dashboard'
}

function guessRole(metadataRole?: string, email?: string): string {
  if (metadataRole) return metadataRole
  const e = email?.toLowerCase() ?? ''
  if (e.includes('buyer')) return 'buyer'
  if (e.includes('admin')) return 'admin'
  if (e.includes('fpo'))   return 'fpo_admin'
  return 'farmer'
}

async function autoConfirmEmail(email: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/confirm-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    return res.ok && data.success
  } catch {
    return false
  }
}

export default function LoginPage() {
  const supabase = createClient()

  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [showPassword,   setShowPassword]   = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [needsConfirm,   setNeedsConfirm]   = useState(false)
  const [showDemo,       setShowDemo]       = useState(false)

  /* ──────────────────────────────────────────────────────────────
     Core sign-in helper — used by both the form and demo buttons
  ────────────────────────────────────────────────────────────── */
  async function signIn(targetEmail: string, targetPassword: string) {
    setLoading(true)
    setNeedsConfirm(false)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: targetPassword,
    })

    if (!error && data.user) {
      toast.success('Signed in! Redirecting…')
      const role = guessRole(data.user.user_metadata?.role, targetEmail)
      window.location.href = roleToDestination(role)
      return
    }

    // Email not confirmed → auto-confirm then retry once
    if (error && (
      error.message.toLowerCase().includes('not confirmed') ||
      error.message.toLowerCase().includes('email not confirmed')
    )) {
      setNeedsConfirm(true)
      const confirmed = await autoConfirmEmail(targetEmail)
      if (confirmed) {
        const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: targetPassword,
        })
        if (!e2 && d2.user) {
          toast.success('Email confirmed & signed in!')
          const role = guessRole(d2.user.user_metadata?.role, targetEmail)
          window.location.href = roleToDestination(role)
          return
        }
      }
      toast.error('Auto-confirm failed. Please check your inbox or contact support.')
      setLoading(false)
      return
    }

    // Any other error
    toast.error(error?.message ?? 'Sign-in failed. Please try again.')
    setLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    signIn(email.trim(), password)
  }

  const handleDemoLogin = (demo: typeof DEMO_LOGINS[0]) => {
    setEmail(demo.email)
    setPassword('Demo@1234')
    setShowDemo(false)
    signIn(demo.email, 'Demo@1234')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B5E20] via-[#2D7D32] to-[#388E3C] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* ── Logo ── */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3 hover:opacity-90 transition-opacity mb-2">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#F9A825] shadow-2xl">
              <Image
                src="/kisansetu-logo.png"
                alt="KisanSetu Logo"
                width={96}
                height={96}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">KisanSetu</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-white">Welcome Back</h1>
          <p className="text-green-200 mt-1 text-sm">Sign in to access your dashboard</p>
        </div>

        {/* ── Card ── */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Email-not-confirmed banner */}
          {needsConfirm && (
            <div className="px-8 pt-6 pb-0">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Email not yet confirmed.</strong> We tried to auto-confirm it — please wait a moment and click <em>Sign In</em> again, or check your inbox.
                </span>
              </div>
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2D7D32] hover:bg-[#1B5E20] disabled:opacity-60 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-[#2D7D32] font-semibold hover:underline">
                Create account
              </Link>
            </p>
          </form>

          {/* ── Demo Logins (collapsible) ── */}
          <div className="border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowDemo(v => !v)}
              className="w-full flex items-center justify-between px-8 py-4 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                Demo accounts for testing
              </span>
              {showDemo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDemo && (
              <div className="px-8 pb-6">
                <p className="text-xs text-gray-400 mb-3">
                  Click any role to sign in instantly (password: <code className="bg-gray-100 px-1 rounded">Demo@1234</code>)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_LOGINS.map(d => (
                    <button
                      key={d.email}
                      type="button"
                      disabled={loading}
                      onClick={() => handleDemoLogin(d)}
                      className="text-sm bg-[#F1F8E9] border border-green-200 hover:bg-green-100 hover:border-green-400 text-gray-700 px-3 py-2.5 rounded-xl text-left transition-colors font-medium disabled:opacity-50"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-8 py-3 text-center">
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1.5">
              <Image src="/kisansetu-logo.png" alt="" width={16} height={16} className="rounded-full" />
              Back to KisanSetu home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

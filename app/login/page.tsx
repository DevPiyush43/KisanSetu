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
  <div className="min-h-screen bg-white flex items-center justify-center p-2 sm:p-4">

    {/* MAIN LOGIN CONTAINER */}
    <div className="w-full min-h-[calc(100vh-1rem)] sm:min-h-[calc(100vh-2rem)] bg-white rounded-[28px] overflow-hidden shadow-sm flex flex-col lg:flex-row">

      {/* ========================================= */}
      {/* LEFT SIDE - IMAGE + KISANSETU CONTENT     */}
      {/* ========================================= */}

      <div
        className="relative w-full lg:w-[52%] min-h-[420px] lg:min-h-full bg-cover bg-center bg-no-repeat rounded-[24px] lg:rounded-[24px] overflow-hidden"
        style={{ backgroundImage: "url('/login1.jpg')" }}
      >

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[#062f2c]/55 pointer-events-none"></div>

        {/* LEFT CONTENT */}
        <div className="relative z-20 h-full flex flex-col justify-between p-8 sm:p-12 text-white">

          {/* Logo */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3 hover:opacity-90 transition-opacity"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#F9A825] shadow-lg">
                <Image
                  src="/kisansetu-logo.png"
                  alt="KisanSetu Logo"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>

              <span className="text-xl sm:text-2xl font-bold">
                KisanSetu
              </span>
            </Link>
          </div>


          {/* Main Text */}
          <div className="max-w-xl mt-16 lg:mt-0">

            <p className="text-[#F9A825] font-bold text-sm uppercase tracking-widest mb-4">
              🌾 Empowering Indian Agriculture
            </p>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black leading-[1.05] tracking-tight mb-6">
              Connecting
              <br />
              <span className="text-[#F9A825]">
                Farmers
              </span>
              <br />
              to Better Markets
            </h1>

            <p className="text-green-50 text-base sm:text-lg leading-relaxed max-w-lg">
              KisanSetu connects farmers and FPOs directly with
              trusted buyers, helping you discover fair prices,
              access better markets, and build transparent
              business relationships.
            </p>

            {/* Features */}
            <div className="mt-7 space-y-3">

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#F9A825] text-[#1B5E20] flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <span className="text-sm sm:text-base">
                  AI-powered price discovery
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#F9A825] text-[#1B5E20] flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <span className="text-sm sm:text-base">
                  Verified and trusted buyers
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#F9A825] text-[#1B5E20] flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <span className="text-sm sm:text-base">
                  Transparent farmer-to-buyer trade
                </span>
              </div>

            </div>

          </div>


          {/* Bottom text */}
          <p className="text-green-100/80 text-xs sm:text-sm mt-10">
            Fair prices • Direct connections • Trusted marketplace
          </p>

        </div>
      </div>


      {/* ========================================= */}
      {/* RIGHT SIDE - LOGIN                         */}
      {/* ========================================= */}

      <div className="w-full lg:w-[48%] bg-white flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20">

        <div className="w-full max-w-md">

          {/* Welcome */}
          <div className="text-center mb-8">

            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              WELCOME BACK!
            </h1>

            <p className="text-gray-500 mt-2 text-sm">
              Welcome back! Please enter your details.
            </p>

          </div>


          {/* LOGIN CARD */}
          <div className="bg-white">

            {/* Email confirmation */}
            {needsConfirm && (
              <div className="mb-6">
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />

                  <span>
                    <strong>Email not yet confirmed.</strong>{" "}
                    We tried to auto-confirm it — please wait a moment
                    and click <em>Sign In</em> again, or check your inbox.
                  </span>
                </div>
              </div>
            )}


            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] focus:border-[#2D7D32] transition-all"
                  />
                </div>
              </div>


              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>

                <div className="relative">

                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] focus:border-[#2D7D32] transition-all"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />
                    }
                  </button>

                </div>
              </div>


              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F9A825] hover:bg-[#064b52] disabled:opacity-60 text-white py-3 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <div className="w-5 h-5 mx-auto border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>


              {/* Create account */}
              <p className="text-center text-sm text-gray-500 pt-2">
                Don't have an account?{" "}
                <Link
                  href="/signup"
                  className="text-[#075B63] font-semibold hover:underline"
                >
                  Sign up
                </Link>
              </p>

            </form>


            {/* Demo Accounts */}
            <div className="mt-6 border-t border-gray-100 pt-4">

              <button
                type="button"
                onClick={() => setShowDemo(v => !v)}
                className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Demo accounts for testing
                </span>

                {showDemo
                  ? <ChevronUp className="w-4 h-4" />
                  : <ChevronDown className="w-4 h-4" />
                }
              </button>


              {showDemo && (
                <div className="mt-4">

                  <p className="text-xs text-gray-400 mb-3">
                    Click any role to sign in instantly
                    (password:{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      Demo@1234
                    </code>)
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


            {/* Back to home */}
            <div className="mt-5 text-center">

              <Link
                href="/"
                className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1.5"
              >
                <Image
                  src="/kisansetu-logo.png"
                  alt=""
                  width={16}
                  height={16}
                  className="rounded-full"
                />

                Back to KisanSetu home
              </Link>

            </div>

          </div>

        </div>
      </div>

    </div>
  </div>
)
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, ArrowLeft, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Role } from '@/lib/types'

const ROLES = [
  {
    id: 'farmer' as Role,
    emoji: '🌾',
    title: 'Farmer',
    description: 'List your produce, track mandi prices, and sell directly to verified buyers.',
    activeColor: 'border-[#2D7D32] bg-[#2D7D32] text-white',
  },
  {
    id: 'fpo_admin' as Role,
    emoji: '🤝',
    title: 'FPO Admin',
    description: 'Pool farmer lots, aggregate produce, and negotiate higher bulk prices.',
    activeColor: 'border-blue-600 bg-blue-600 text-white',
  },
  {
    id: 'buyer' as Role,
    emoji: '🏢',
    title: 'Buyer',
    description: 'Browse verified produce lots, view AI match scores, and issue contracts.',
    activeColor: 'border-amber-600 bg-amber-600 text-white',
  },
  {
    id: 'admin' as Role,
    emoji: '🛡️',
    title: 'Platform Admin',
    description: 'Manage users, verify KYC documents, and resolve contract grievances.',
    activeColor: 'border-purple-600 bg-purple-600 text-white',
  },
]

export default function SignupPage() {
  const supabase = createClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [unconfirmedMessage, setUnconfirmedMessage] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) { toast.error('Please select a role'); return }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }

    setLoading(true)
    setUnconfirmedMessage(null)

    try {
      // 1. Server-side admin signup (auto-confirms email)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedRole }),
      })

      const result = await res.json()

      if (res.ok && result.success) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (!signInErr) {
          toast.success('Account created & confirmed! Welcome to KisanSetu 🌾')
          redirectUser(selectedRole)
          return
        }
      }

      // 2. Fallback: client-side signUp
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: selectedRole } },
      })

      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }

      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            role: selectedRole,
            language_pref: 'hi',
            trust_score: 50,
          })
        } catch { /* ignore */ }

        const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })

        if (loginErr?.message?.toLowerCase().includes('email not confirmed')) {
          const confirmRes = await fetch('/api/auth/confirm-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          })
          const confirmData = await confirmRes.json()

          if (confirmRes.ok && confirmData.success) {
            const { error: retryErr } = await supabase.auth.signInWithPassword({ email, password })
            if (!retryErr) {
              toast.success('Account created & confirmed!')
              redirectUser(selectedRole)
              return
            }
          }

          setUnconfirmedMessage('Account created! Please check your email to confirm, OR click below to auto-confirm for testing.')
          toast.info('Account created! Email confirmation required.')
          setLoading(false)
          return
        }

        toast.success('Account created! Redirecting...')
        redirectUser(selectedRole)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Signup failed')
      setLoading(false)
    }
  }

  const handleAutoConfirm = async () => {
    setLoading(true)
    const res = await fetch('/api/auth/confirm-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error && selectedRole) {
        toast.success('Email confirmed! Logged in.')
        redirectUser(selectedRole)
        return
      }
      toast.success('Email confirmed! You can now log in.')
      window.location.href = '/login'
    } else {
      toast.error(data.error || 'Failed to auto-confirm email')
      setLoading(false)
    }
  }

  const redirectUser = (role: Role) => {
    let dest = '/dashboard'
    if (role === 'buyer') dest = '/onboarding/buyer'
    else if (role === 'farmer' || role === 'fpo_admin') dest = '/onboarding/farmer'
    else if (role === 'admin') dest = '/admin'
    window.location.href = dest
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-2 sm:p-4">
      <div className="w-full min-h-[calc(100vh-1rem)] sm:min-h-[calc(100vh-2rem)] bg-white rounded-[28px] overflow-hidden flex flex-col lg:flex-row">

        {/* ── LEFT SIDE — background image + branding ── */}
        <div
          className="relative w-full lg:w-[52%] min-h-[420px] lg:min-h-full bg-cover bg-center bg-no-repeat rounded-[24px] overflow-hidden"
          style={{ backgroundImage: "url('/login1.jpg')" }}
        >
          <div className="absolute inset-0 bg-[#062f2c]/60 pointer-events-none" />

          <div className="relative z-20 h-full flex flex-col justify-between p-8 sm:p-12 text-white">
            {/* Logo */}
            <div>
              <Link href="/" className="inline-flex items-center gap-3 hover:opacity-90 transition-opacity">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#F9A825] shadow-lg">
                  <Image src="/kisansetu-logo.png" alt="KisanSetu Logo" width={48} height={48} className="w-full h-full object-cover" priority />
                </div>
                <span className="text-xl sm:text-2xl font-bold">KisanSetu</span>
              </Link>
            </div>

            {/* Hero */}
            <div className="max-w-xl mt-16 lg:mt-0">
              <p className="text-[#F9A825] font-bold text-sm uppercase tracking-widest mb-4">🌾 Empowering Indian Agriculture</p>
              <h2 className="text-4xl sm:text-5xl xl:text-6xl font-black leading-[1.05] tracking-tight mb-6">
                Join the<br />
                <span className="text-[#F9A825]">KisanSetu</span><br />
                Marketplace
              </h2>
              <p className="text-green-50 text-base sm:text-lg leading-relaxed max-w-lg">
                Create your account and connect with farmers, FPOs, and trusted buyers
                through a transparent agricultural marketplace.
              </p>
              <div className="mt-7 space-y-3">
                {[
                  'Discover fair and transparent prices',
                  'Connect with verified market participants',
                  'Build trusted direct trade relationships',
                ].map(feat => (
                  <div key={feat} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#F9A825] text-[#1B5E20] flex items-center justify-center font-bold text-sm shrink-0">✓</div>
                    <span className="text-sm sm:text-base">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-green-100/80 text-xs sm:text-sm mt-10">Fair prices • Direct connections • Trusted marketplace</p>
          </div>
        </div>

        {/* ── RIGHT SIDE — signup form ── */}
        <div className="w-full lg:w-[48%] bg-white flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20 overflow-y-auto">
          <div className="w-full max-w-md">

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">CREATE ACCOUNT</h1>
              <p className="text-gray-500 mt-2 text-sm">Join KisanSetu and start connecting with the market.</p>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-3 mt-6">
                <div className={`flex items-center gap-2 text-xs font-semibold ${step === 1 ? 'text-[#2D7D32]' : 'text-gray-400'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${step === 1 ? 'bg-[#2D7D32] text-white' : 'bg-gray-100 text-gray-400'}`}>1</span>
                  Role
                </div>
                <div className="w-10 h-px bg-gray-200" />
                <div className={`flex items-center gap-2 text-xs font-semibold ${step === 2 ? 'text-[#2D7D32]' : 'text-gray-400'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${step === 2 ? 'bg-[#2D7D32] text-white' : 'bg-gray-100 text-gray-400'}`}>2</span>
                  Account
                </div>
              </div>
            </div>

            {step === 1 ? (
              /* STEP 1 — Role selection */
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Select your role</h2>
                <p className="text-sm text-gray-500 mb-5">Choose how you will use KisanSetu</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROLES.map(role => {
                    const isSelected = selectedRole === role.id
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                          isSelected ? role.activeColor : 'border-gray-200 hover:border-[#2D7D32] bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{role.emoji}</span>
                          <div>
                            <p className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-800'}`}>{role.title}</p>
                            <p className={`text-xs mt-1 leading-relaxed ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>{role.description}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <button
                  id="signup-continue"
                  onClick={() => setStep(2)}
                  disabled={!selectedRole}
                  className="mt-6 w-full bg-[#2D7D32] hover:bg-[#1B5E20] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-center text-sm text-gray-500 mt-6">
                  Already have an account?{' '}
                  <Link href="/login" className="text-[#2D7D32] font-semibold hover:underline">Sign in</Link>
                </p>
              </div>
            ) : (
              /* STEP 2 — Account details */
              <form onSubmit={handleSignup} className="space-y-5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#2D7D32] transition-colors mb-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Role Selection
                </button>

                <div className="bg-[#F1F8E9] border border-green-200 rounded-xl p-3 text-xs text-green-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <span>Selected Role: <strong className="capitalize">{selectedRole?.replace('_', ' ')}</strong></span>
                </div>

                {unconfirmedMessage && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-2 text-amber-900 text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{unconfirmedMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoConfirm}
                      disabled={loading}
                      className="w-full bg-[#F9A825] hover:bg-amber-500 text-[#1B5E20] text-xs font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      ⚡ Auto-Confirm Email & Log In Now
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] focus:border-[#2D7D32] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] focus:border-[#2D7D32] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] focus:border-[#2D7D32] transition-all"
                  />
                </div>

                <button
                  id="signup-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2D7D32] hover:bg-[#1B5E20] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <p className="text-center text-sm text-gray-500 pt-1">
                  Already have an account?{' '}
                  <Link href="/login" className="text-[#2D7D32] font-semibold hover:underline">Sign in</Link>
                </p>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

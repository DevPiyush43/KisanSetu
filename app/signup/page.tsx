'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Leaf, ArrowRight, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Role } from '@/lib/types'

const ROLES = [
  {
    id: 'farmer' as Role,
    emoji: '🌾',
    title: 'Farmer',
    description: 'List your produce, track prices, and connect with verified buyers directly.',
    color: 'border-green-500 bg-green-50',
    activeColor: 'border-[#2D7D32] bg-[#2D7D32] text-white',
  },
  {
    id: 'fpo_admin' as Role,
    emoji: '🤝',
    title: 'FPO Admin',
    description: 'Pool farmer lots, negotiate as a collective, and increase bargaining power.',
    color: 'border-blue-500 bg-blue-50',
    activeColor: 'border-blue-600 bg-blue-600 text-white',
  },
  {
    id: 'buyer' as Role,
    emoji: '🏭',
    title: 'Buyer',
    description: 'Browse verified lots, get match scores, and source directly from farmers.',
    color: 'border-amber-500 bg-amber-50',
    activeColor: 'border-amber-600 bg-amber-600 text-white',
  },
]

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { toast.error(error.message); setLoading(false); return }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        role: selectedRole,
        language_pref: 'hi',
        trust_score: 50,
      })
      if (profileError) console.error('Profile creation error:', profileError)

      toast.success('Account created! Complete your profile.')
      if (selectedRole === 'buyer') router.push('/onboarding/buyer')
      else router.push('/onboarding/farmer')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B5E20] via-[#2D7D32] to-[#388E3C] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full mb-4">
            <Leaf className="w-5 h-5 text-[#F9A825]" />
            <span className="text-white font-bold text-lg">KisanSetu</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Create your account</h1>
          <p className="text-green-200 mt-1">Step {step} of 2</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === 1 ? (
            <>
              <h2 className="text-lg font-bold text-gray-800 mb-1">I am a...</h2>
              <p className="text-sm text-gray-500 mb-5">Choose your role to get started</p>
              <div className="space-y-3">
                {ROLES.map(role => {
                  const isSelected = selectedRole === role.id
                  return (
                    <button key={role.id} type="button" onClick={() => setSelectedRole(role.id)}
                      className={`w-full text-left px-4 py-4 rounded-xl border-2 transition-all ${isSelected ? role.activeColor : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{role.emoji}</span>
                        <div>
                          <p className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-800'}`}>{role.title}</p>
                          <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>{role.description}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setStep(2)} disabled={!selectedRole}
                className="mt-6 w-full bg-[#2D7D32] hover:bg-[#1B5E20] text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-lg font-bold text-gray-800">Create your account</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" minLength={6}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32] transition-all" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#2D7D32] hover:bg-[#1B5E20] text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
              </button>
              <p className="text-center text-sm text-gray-500">
                Already have an account? <Link href="/login" className="text-[#2D7D32] font-semibold hover:underline">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

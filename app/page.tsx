'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Leaf, TrendingUp, ShieldCheck, FileText, ArrowRight, Truck,
  Sparkles, CheckCircle2, Award, Zap, Handshake, Users, ChevronRight,
  PlayCircle, RefreshCw, Layers
} from 'lucide-react'

export default function SplashLandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showSplash, setShowSplash] = useState(true)
  const [splashProgress, setSplashProgress] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUser(user)
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setRole(profile?.role ?? 'farmer')
      }
    })

    // Splash animation progress
    const interval = setInterval(() => {
      setSplashProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 25
      })
    }, 300)

    return () => clearInterval(interval)
  }, [])

  const enterApp = () => {
    setShowSplash(false)
  }

  const getDashboardUrl = () => {
    if (!user) return '/login'
    if (role === 'buyer') return '/buyer/browse'
    if (role === 'admin') return '/admin'
    return '/dashboard'
  }

  return (
    <div className="min-h-screen bg-[#F1F8E9] text-gray-800 font-sans selection:bg-[#2D7D32] selection:text-white">
      {/* ─── 1. ANIMATED INTRO SPLASH OVERLAY ─── */}
      {showSplash && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#1B5E20] via-[#2D7D32] to-[#144217] flex flex-col items-center justify-center p-6 text-white text-center transition-opacity duration-700">
          <div className="animate-bounce mb-6">
            <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl">
              <Leaf className="w-12 h-12 text-[#F9A825]" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2">KisanSetu</h1>
          <p className="text-green-200 text-lg max-w-md mb-6 font-medium">
            Bridging Farmers & Buyers with Transparent Price Discovery & Trusted Direct Linkages
          </p>

          {/* Progress Bar */}
          <div className="w-64 bg-white/20 rounded-full h-2 mb-6 overflow-hidden">
            <div
              className="bg-[#F9A825] h-full transition-all duration-300 rounded-full"
              style={{ width: `${splashProgress}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={enterApp}
              className="bg-[#F9A825] hover:bg-amber-400 text-[#1B5E20] px-8 py-3 rounded-xl font-bold text-base shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              Explore Platform <ArrowRight className="w-5 h-5" />
            </button>
            {user ? (
              <Link
                href={getDashboardUrl()}
                className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold text-base transition-all border border-white/30"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold text-base transition-all border border-white/30"
              >
                Sign In / Demo
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ─── 2. MAIN PLATFORM SHOWCASE ─── */}
      {/* Header Navbar */}
      <header className="sticky top-0 z-40 bg-[#1B5E20]/95 backdrop-blur text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-xl">
            <Leaf className="w-7 h-7 text-[#F9A825]" />
            <span>KisanSetu</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href={getDashboardUrl()}
                className="bg-[#F9A825] hover:bg-amber-400 text-[#1B5E20] font-bold text-sm px-4 py-2 rounded-xl transition-all shadow"
              >
                My Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-green-100 hover:text-white px-3 py-2 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-[#F9A825] hover:bg-amber-400 text-[#1B5E20] font-bold text-sm px-4 py-2 rounded-xl transition-all shadow"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#1B5E20] to-[#2D7D32] text-white py-16 sm:py-24 px-4">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 rounded-full text-xs font-semibold text-[#F9A825] mb-6">
            <Sparkles className="w-4 h-4" /> Smart India Hackathon 2025 • Problem Statement 26132
          </span>
          <h1 className="text-3xl sm:text-6xl font-black leading-tight tracking-tight mb-6">
            Strengthening Market Linkages & Price Discovery for Every Farmer
          </h1>
          <p className="text-base sm:text-xl text-green-100 max-w-3xl mx-auto mb-8 font-normal leading-relaxed">
            KisanSetu connects smallholder farmers and FPOs directly with verified buyers, processors, and institutional aggregators — eliminating exploitative middlemen with AI price forecasting and SHA-256 trust ledgers.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href={user ? getDashboardUrl() : "/signup"}
              className="bg-[#F9A825] hover:bg-amber-400 text-[#1B5E20] px-8 py-3.5 rounded-xl font-black text-base shadow-xl transition-all hover:scale-105 flex items-center gap-2"
            >
              Get Started Now <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-6 py-3.5 rounded-xl font-bold text-base transition-all"
            >
              🎯 Try Demo Logins
            </Link>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="max-w-6xl mx-auto px-4 -mt-10 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 border border-green-100">
          {[
            { label: 'Mandis Monitored', value: '120+', icon: TrendingUp, color: 'text-green-600' },
            { label: 'Verified Buyers', value: '1,400+', icon: Users, color: 'text-blue-600' },
            { label: 'Trust Ledger Events', value: '100% Hash-Chained', icon: ShieldCheck, color: 'text-purple-600' },
            { label: 'Farmer Fair Margin', value: '+18-25%', icon: Award, color: 'text-amber-600' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-2`} />
              <p className="text-2xl sm:text-3xl font-black text-gray-900">{stat.value}</p>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Platform Modules */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Key Features & Technical Architecture</h2>
          <p className="text-gray-600 text-sm">Everything built for 50% feature depth hackathon prototype</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: TrendingUp,
              title: '1. Price Discovery & AI Advisory',
              desc: 'Interactive 14-day Recharts price curves across Indore, Bhopal, Nagpur, Pune & Jaipur mandis. Moving-average slope AI recommends optimal SELL NOW or HOLD timing.',
              bg: 'bg-green-50 text-green-700',
            },
            {
              icon: Sparkles,
              title: '2. Buyer Match Score & Lot Wizard',
              desc: '4-step lot creation wizard with quality grading and photo uploads. Automated match scoring ranks lots for buyers based on crop preferences and geographic proximity.',
              bg: 'bg-amber-50 text-amber-700',
            },
            {
              icon: ShieldCheck,
              title: '3. SHA-256 Trust Ledger',
              desc: 'Immutable, append-only cryptographic event chain recording every accepted offer, payment update, and verified KYC document to build dynamic Trust Scores.',
              bg: 'bg-purple-50 text-purple-700',
            },
            {
              icon: FileText,
              title: '4. Digital Contracts & Escrow Tracker',
              desc: 'Auto-generated digital sale agreements complete with milestone payment progress tracking, logistics provider directory, and formal grievance filing.',
              bg: 'bg-blue-50 text-blue-700',
            },
            {
              icon: Handshake,
              title: '5. FPO Produce Pooling',
              desc: 'Allows Farmers Producer Organizations to aggregate smallholder yields into combined bulk listings, enabling small farmers to sell to large institutional buyers.',
              bg: 'bg-teal-50 text-teal-700',
            },
            {
              icon: Truck,
              title: '6. Regional Logistics Integration',
              desc: 'Integrated directory of verified regional transporters, cold storage facilities, and agricultural warehouses mapped per district.',
              bg: 'bg-indigo-50 text-indigo-700',
            },
          ].map(feat => (
            <div key={feat.title} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className={`w-12 h-12 rounded-2xl ${feat.bg} flex items-center justify-center mb-4`}>
                  <feat.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Role Workflows */}
      <section className="bg-white py-16 border-t border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Tailored Workflows for Every Stakeholder</h2>
            <p className="text-gray-600 text-sm">Select your role to explore the dedicated dashboard flow</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                role: '🌾 Farmer',
                desc: 'List produce, check market prices, receive buyer offers, negotiate counters, and view payment status.',
                cta: 'Sign In as Farmer',
                email: 'farmer1@kisansetu.demo',
              },
              {
                role: '🏭 Buyer',
                desc: 'Browse verified lots, filter by grade/district, review AI match scores, and issue purchase offers.',
                cta: 'Sign In as Buyer',
                email: 'buyer1@kisansetu.demo',
              },
              {
                role: '🤝 FPO Admin',
                desc: 'Pool member lots into bulk sales, negotiate directly with institutional buyers, and track payouts.',
                cta: 'Sign In as FPO',
                email: 'fpo1@kisansetu.demo',
              },
              {
                role: '👑 Admin',
                desc: 'View platform KPI metrics, verify user KYC credentials, and resolve contract grievances.',
                cta: 'Sign In as Admin',
                email: 'admin@kisansetu.demo',
              },
            ].map(card => (
              <div key={card.role} className="bg-[#F1F8E9] rounded-2xl p-6 border border-green-200 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{card.role}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed mb-6">{card.desc}</p>
                </div>
                <Link
                  href="/login"
                  className="w-full bg-[#2D7D32] hover:bg-[#1B5E20] text-white py-2.5 rounded-xl font-semibold text-xs text-center transition-all shadow-sm"
                >
                  {card.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1B5E20] text-white py-12 px-4 sm:px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 font-bold text-lg mb-2">
              <Leaf className="w-5 h-5 text-[#F9A825]" />
              <span>KisanSetu</span>
            </div>
            <p className="text-xs text-green-200">
              Built for Smart India Hackathon 2025 • Problem Statement 26132
            </p>
          </div>
          <div className="text-xs text-green-200">
            <p>Next.js 15 • Supabase • TypeScript • Tailwind CSS • Recharts</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

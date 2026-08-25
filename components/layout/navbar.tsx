'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import {
  Leaf, LayoutDashboard, TrendingUp, Package, PlusCircle,
  ShoppingCart, FileText, Users, AlertCircle, BarChart2,
  HandshakeIcon, LogOut, User, ChevronDown,
  Menu, X
} from 'lucide-react'

interface NavbarProps {
  profile: Profile | null
}

const farmerNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/prices', label: 'Prices', icon: TrendingUp },
  { href: '/lots', label: 'My Lots', icon: Package },
  { href: '/lots/create', label: 'Create Lot', icon: PlusCircle },
  { href: '/offers', label: 'Offers', icon: FileText },
]

const buyerNav = [
  { href: '/buyer/browse', label: 'Browse Lots', icon: ShoppingCart },
  { href: '/offers', label: 'My Offers', icon: FileText },
  { href: '/prices', label: 'Prices', icon: TrendingUp },
]

const fpoNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/lots', label: 'Lots', icon: Package },
  { href: '/fpo/pool', label: 'FPO Pool', icon: HandshakeIcon },
  { href: '/offers', label: 'Offers', icon: FileText },
  { href: '/prices', label: 'Prices', icon: TrendingUp },
]

const adminNav = [
  { href: '/admin', label: 'Dashboard', icon: BarChart2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/grievances', label: 'Grievances', icon: AlertCircle },
]

export function Navbar({ profile }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const navItems = profile?.role === 'buyer' ? buyerNav
    : profile?.role === 'fpo_admin' ? fpoNav
    : profile?.role === 'admin' ? adminNav
    : farmerNav

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleLabel = profile?.role === 'fpo_admin' ? 'FPO Admin'
    : profile?.role === 'buyer' ? 'Buyer'
    : profile?.role === 'admin' ? 'Admin'
    : 'Farmer'

  return (
    <nav className="bg-[#1B5E20] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={profile?.role === 'buyer' ? '/buyer/browse' : profile?.role === 'admin' ? '/admin' : '/dashboard'}
            className="flex items-center gap-2 font-bold text-xl hover:opacity-90 transition-opacity">
            <Leaf className="w-7 h-7 text-[#F9A825]" />
            <span>KisanSetu</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${active ? 'bg-white/20 text-white' : 'text-green-100 hover:bg-white/10 hover:text-white'}`}>
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button className="text-xs font-medium bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors">
              EN | हि
            </button>

            {/* User dropdown */}
            {profile && (
              <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors text-sm">
                  <div className="w-7 h-7 rounded-full bg-[#F9A825] flex items-center justify-center text-[#1B5E20] font-bold text-xs">
                    {profile.full_name?.charAt(0) ?? 'U'}
                  </div>
                  <span className="hidden sm:block max-w-[120px] truncate">{profile.full_name ?? 'User'}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50"
                    onClick={() => setDropdownOpen(false)}>
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500">{roleLabel}</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">{profile.full_name}</p>
                    </div>
                    <Link href={`/profile/${profile.id}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <User className="w-4 h-4" /> My Profile
                    </Link>
                    <Link href="/grievances/new"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <AlertCircle className="w-4 h-4" /> File Grievance
                    </Link>
                    <button onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/10">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#1B5E20] px-4 pb-4">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-green-100 hover:text-white hover:bg-white/10 rounded-lg mt-1">
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslation, Locale } from '@/lib/i18n'
import { ChevronDown, Globe } from 'lucide-react'

const LOCALE_FLAGS: Record<Locale, string> = {
  en: '🇬🇧',
  hi: '🇮🇳',
  mr: '🇮🇳',
  gu: '🇮🇳',
}

const LOCALE_SHORT: Record<Locale, string> = {
  en: 'EN',
  hi: 'हि',
  mr: 'मरा',
  gu: 'ગુ',
}

export function LanguageSwitcher() {
  const { locale, setLocale, localeLabels } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        id="language-switcher-btn"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-colors text-white"
        aria-label="Change language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{LOCALE_SHORT[locale]}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 overflow-hidden">
          {(Object.keys(localeLabels) as Locale[]).map(l => (
            <button
              key={l}
              id={`lang-${l}`}
              onClick={() => { setLocale(l); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left
                ${locale === l
                  ? 'bg-[#F1F8E9] text-[#2D7D32] font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 font-normal'
                }`}
            >
              <span className="text-base">{LOCALE_FLAGS[l]}</span>
              <span>{localeLabels[l]}</span>
              {locale === l && <span className="ml-auto text-[#2D7D32] text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

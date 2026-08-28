'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { en } from './locales/en'
import { hi } from './locales/hi'
import { mr } from './locales/mr'
import { gu } from './locales/gu'

export type Locale = 'en' | 'hi' | 'mr' | 'gu'

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिंदी',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
}

const dictionaries: Record<Locale, Record<string, string>> = { en, hi, mr, gu }

interface I18nContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, fallback?: string) => string
  localeLabels: typeof LOCALE_LABELS
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (k) => k,
  localeLabels: LOCALE_LABELS,
})

const STORAGE_KEY = 'kisansetu_lang'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (saved && dictionaries[saved]) {
        setLocaleState(saved)
      }
    } catch { /* localStorage may be unavailable */ }
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch { /* ignore */ }
  }, [])

  const t = useCallback((key: string, fallback?: string): string => {
    return (
      dictionaries[locale]?.[key] ??
      en[key] ??
      fallback ??
      key
    )
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, localeLabels: LOCALE_LABELS }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useTranslation = () => useContext(I18nContext)

/** Server-safe helper: returns the key itself (for Server Components).
 *  Client components should use useTranslation() hook instead. */
export function serverT(key: string): string {
  return en[key] ?? key
}

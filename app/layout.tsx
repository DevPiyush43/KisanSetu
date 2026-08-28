import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { I18nProvider } from '@/lib/i18n'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KisanSetu - Farmer Market Platform',
  description: 'Connecting farmers and buyers through transparent price discovery, digital lot management, and trusted market linkages.',
  keywords: 'farmers, mandi prices, agricultural marketplace, FPO, crop trading, India',
  icons: {
    icon: '/kisansetu-logo.png',
    shortcut: '/kisansetu-logo.png',
    apple: '/kisansetu-logo.png',
  },
  openGraph: {
    title: 'KisanSetu',
    description: 'Empowering farmers with price visibility and direct market access',
    type: 'website',
    images: [
      {
        url: '/kisansetu-logo.png',
        width: 800,
        height: 800,
        alt: 'KisanSetu Logo',
      },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#F1F8E9] min-h-screen`}>
        <I18nProvider>
          {children}
          <Toaster richColors position="top-right" />
        </I18nProvider>
      </body>
    </html>
  )
}

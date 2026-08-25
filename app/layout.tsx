import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KisanSetu - Farmer Market Platform',
  description: 'Connecting farmers and buyers through transparent price discovery, digital lot management, and trusted market linkages.',
  keywords: 'farmers, mandi prices, agricultural marketplace, FPO, crop trading, India',
  openGraph: {
    title: 'KisanSetu',
    description: 'Empowering farmers with price visibility and direct market access',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#F1F8E9] min-h-screen`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}

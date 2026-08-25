import { CROP_EMOJI } from './types'

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

export function getTrustScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-amber-500'
  return 'text-red-500'
}

export function getTrustScoreBg(score: number): string {
  if (score >= 70) return 'bg-green-100 text-green-800'
  if (score >= 40) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    listed: 'bg-blue-100 text-blue-700',
    offer_received: 'bg-amber-100 text-amber-700',
    negotiating: 'bg-orange-100 text-orange-700',
    sold: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-700',
    countered: 'bg-purple-100 text-purple-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    partially_paid: 'bg-amber-100 text-amber-700',
    paid: 'bg-green-100 text-green-700',
    open: 'bg-amber-100 text-amber-700',
    resolved: 'bg-green-100 text-green-700',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-700'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    listed: 'Listed',
    offer_received: 'Offer Received',
    negotiating: 'Negotiating',
    sold: 'Sold',
    expired: 'Expired',
    pending: 'Pending',
    countered: 'Countered',
    accepted: 'Accepted',
    rejected: 'Rejected',
    partially_paid: 'Partially Paid',
    paid: 'Paid',
    open: 'Open',
    resolved: 'Resolved',
  }
  return labels[status] ?? status
}

export function cropEmoji(crop: string): string {
  return CROP_EMOJI[crop] ?? '🌱'
}

export function getPriceRange(crop: string): { min: number; max: number } {
  const ranges: Record<string, { min: number; max: number }> = {
    Wheat: { min: 2000, max: 2400 },
    Paddy: { min: 1800, max: 2200 },
    Cotton: { min: 5500, max: 6500 },
    Soybean: { min: 4000, max: 5000 },
    Tomato: { min: 800, max: 2500 },
  }
  return ranges[crop] ?? { min: 1000, max: 5000 }
}

export function computeSlope(prices: number[]): number {
  if (prices.length < 2) return 0
  const n = prices.length
  const xMean = (n - 1) / 2
  const yMean = prices.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (prices[i] - yMean)
    den += (i - xMean) ** 2
  }
  return den === 0 ? 0 : num / den
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function calculateForecast(crop: string, mandi: string, prices: number[]) {
  if (!prices || prices.length < 3) {
    return {
      recommendation: 'sell_now' as const,
      confidence: 0.45,
      reason: 'Insufficient price history. Selling now avoids storage risks.',
    }
  }
  const recent = prices.slice(-7)
  const slope = computeSlope(recent)
  const avgPrice = recent.reduce((a, b) => a + b, 0) / recent.length
  const slopePct = (slope / avgPrice) * 100

  if (slopePct > 1.5) {
    const confidence = Math.min(0.55 + slopePct * 0.05, 0.92)
    return {
      recommendation: 'hold' as const,
      confidence: parseFloat(confidence.toFixed(2)),
      reason: `${crop} prices in ${mandi} are trending upward (+${slopePct.toFixed(1)}%/day avg). Holding for 3-5 days may yield better returns if storage is available.`,
    }
  } else if (slopePct < -1.5) {
    const confidence = Math.min(0.55 + Math.abs(slopePct) * 0.05, 0.90)
    return {
      recommendation: 'sell_now' as const,
      confidence: parseFloat(confidence.toFixed(2)),
      reason: `${crop} prices are declining (${slopePct.toFixed(1)}%/day avg). Selling now minimizes further loss. Consider locking in current rates.`,
    }
  } else {
    return {
      recommendation: 'sell_now' as const,
      confidence: 0.52,
      reason: `${crop} prices in ${mandi} are relatively stable (±1.5%/day). Current price is within normal range — selling now avoids storage cost and uncertainty.`,
    }
  }
}

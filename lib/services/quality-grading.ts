/**
 * Quality Grading Service
 * Auto-calculates produce grade from quality questionnaire
 */

export interface QualityParams {
  moisture: 'low' | 'medium' | 'high'   // low=<12%, medium=12-14%, high=>14%
  foreignMatter: 'low' | 'medium' | 'high'  // low=0-5%, medium=5-10%, high=>10%
  damage: 'none' | 'low' | 'medium' | 'high'  // none, <5%, 5-15%, >15%
  daysSinceHarvest: number
  storageMethod: 'openAir' | 'covered' | 'coldStorage' | 'warehouse'
}

export type Grade = 'Premium' | 'A' | 'B' | 'C'

export interface GradeResult {
  grade: Grade
  score: number
  breakdown: {
    moisture: number
    foreignMatter: number
    damage: number
    freshness: number
    storage: number
  }
  emoji: string
  color: string
  bgColor: string
}

/** Calculate quality score (0-100) and grade */
export function calculateGrade(quality: QualityParams): GradeResult {
  let score = 100
  const breakdown = { moisture: 0, foreignMatter: 0, damage: 0, freshness: 0, storage: 0 }

  // Moisture deductions
  if (quality.moisture === 'high')   { score -= 30; breakdown.moisture = -30 }
  else if (quality.moisture === 'medium') { score -= 10; breakdown.moisture = -10 }

  // Foreign matter deductions
  if (quality.foreignMatter === 'high')   { score -= 30; breakdown.foreignMatter = -30 }
  else if (quality.foreignMatter === 'medium') { score -= 15; breakdown.foreignMatter = -15 }

  // Damage deductions
  if (quality.damage === 'high')   { score -= 30; breakdown.damage = -30 }
  else if (quality.damage === 'medium') { score -= 15; breakdown.damage = -15 }
  else if (quality.damage === 'low') { score -= 5; breakdown.damage = -5 }

  // Freshness deductions
  if (quality.daysSinceHarvest > 60)  { score -= 25; breakdown.freshness = -25 }
  else if (quality.daysSinceHarvest > 30) { score -= 15; breakdown.freshness = -15 }
  else if (quality.daysSinceHarvest > 14) { score -= 5; breakdown.freshness = -5 }

  // Storage method deductions
  if (quality.storageMethod === 'openAir') { score -= 15; breakdown.storage = -15 }
  else if (quality.storageMethod === 'covered') { score -= 5; breakdown.storage = -5 }
  // coldStorage and warehouse get 0 deduction

  score = Math.max(0, Math.min(100, score))

  let grade: Grade
  let emoji: string
  let color: string
  let bgColor: string

  if (score >= 85) {
    grade = 'Premium'; emoji = '🏆'; color = 'text-amber-700'; bgColor = 'bg-amber-50 border-amber-200'
  } else if (score >= 65) {
    grade = 'A'; emoji = '⭐'; color = 'text-green-700'; bgColor = 'bg-green-50 border-green-200'
  } else if (score >= 40) {
    grade = 'B'; emoji = '✅'; color = 'text-blue-700'; bgColor = 'bg-blue-50 border-blue-200'
  } else {
    grade = 'C'; emoji = '⚠️'; color = 'text-red-600'; bgColor = 'bg-red-50 border-red-200'
  }

  return { grade, score, breakdown, emoji, color, bgColor }
}

/** Returns the quality display string */
export function gradeDisplay(grade: string): string {
  const map: Record<string, string> = {
    Premium: '🏆 Premium',
    A: '⭐ Grade A',
    B: '✅ Grade B',
    C: '⚠️ Grade C',
  }
  return map[grade] ?? grade
}

/** Returns color classes for a given grade */
export function gradeColor(grade: string): { text: string; bg: string } {
  const map: Record<string, { text: string; bg: string }> = {
    Premium: { text: 'text-amber-700', bg: 'bg-amber-100' },
    A: { text: 'text-green-700', bg: 'bg-green-100' },
    B: { text: 'text-blue-700', bg: 'bg-blue-100' },
    C: { text: 'text-red-600', bg: 'bg-red-100' },
  }
  return map[grade] ?? { text: 'text-gray-600', bg: 'bg-gray-100' }
}

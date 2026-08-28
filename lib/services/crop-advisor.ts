/**
 * Crop Advisor Service
 * Recommends crops based on season, district, and soil type
 */

import { CROP_CALENDAR, CropSeason, SoilType } from '@/lib/data/crop-calendar'

export interface CropRecommendation {
  cropSeason: CropSeason
  score: number           // relevance score 0-100
  reasons: string[]       // why this crop is recommended
  isIdealDistrict: boolean
  isCurrentSowingWindow: boolean
}

/** Get the current agricultural season */
export function getCurrentSeason(month: number): 'kharif' | 'rabi' | 'zaid' {
  if (month >= 6 && month <= 9) return 'kharif'   // Jun-Sep
  if (month >= 10 || month <= 2) return 'rabi'    // Oct-Feb
  return 'zaid'                                     // Mar-May
}

/** Get crop recommendations for a given district, month, and optional soil type */
export function getRecommendedCrops(
  month: number,
  district: string,
  soilType?: SoilType,
  topN = 3,
): CropRecommendation[] {
  const currentSeason = getCurrentSeason(month)

  const recommendations: CropRecommendation[] = CROP_CALENDAR.map(cs => {
    let score = 0
    const reasons: string[] = []

    // Currently in sowing window
    const isCurrentSowingWindow = cs.sowingMonths.includes(month)
    if (isCurrentSowingWindow) { score += 40; reasons.push('Now is the ideal sowing time') }

    // One month before sowing window (prepare ahead)
    const nextMonth = (month % 12) + 1
    if (cs.sowingMonths.includes(nextMonth)) { score += 20; reasons.push('Sowing window starts next month') }

    // Ideal district
    const isIdealDistrict = cs.idealDistricts.includes(district)
    if (isIdealDistrict) { score += 25; reasons.push(`Well-suited for ${district}`) }

    // Soil type match
    if (soilType && cs.soilTypes.includes(soilType)) {
      score += 15; reasons.push('Matches your soil type')
    }

    // Season bonus
    if (cs.season === currentSeason) { score += 10; reasons.push(`${currentSeason} season crop`) }

    return {
      cropSeason: cs,
      score,
      reasons,
      isIdealDistrict,
      isCurrentSowingWindow,
    }
  })

  // Sort by score desc and return top N with score > 0
  return recommendations
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}

/** Get farming tips for a specific crop */
export function getCropTips(cropName: string, locale: 'en' | 'hi' | 'mr' | 'gu' = 'en'): string {
  const cs = CROP_CALENDAR.find(c => c.crop.toLowerCase() === cropName.toLowerCase())
  if (!cs) return `No specific tips available for ${cropName}.`

  // Return Hindi tips for hi/mr/gu if available
  if (locale !== 'en' && cs.tipsHi) return cs.tipsHi
  return cs.tips
}

/** Format crop recommendation as chat message */
export function formatCropRecommendationMessage(
  recs: CropRecommendation[],
  month: number,
  district: string,
  locale: 'en' | 'hi' = 'en',
): string {
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  if (recs.length === 0) {
    return locale === 'hi'
      ? `${monthNames[month]} में ${district} के लिए कोई सक्रिय बुवाई की फसल नहीं है। अगले मौसम की तैयारी करें।`
      : `No active sowing crops for ${district} in ${monthNames[month]}. Prepare for the next season.`
  }

  const header = locale === 'hi'
    ? `🌾 ${monthNames[month]} में ${district} के लिए अनुशंसित फसलें:\n\n`
    : `🌾 Best crops to sow this month (${monthNames[month]}) in ${district}:\n\n`

  const items = recs.map((rec, i) => {
    const cs = rec.cropSeason
    const sowStr = cs.sowingMonths.map(m => monthNames[m].slice(0, 3)).join('-')
    const harvStr = cs.harvestMonths.map(m => monthNames[m].slice(0, 3)).join('-')

    if (locale === 'hi') {
      return `${i + 1}. ${cs.crop} — ${cs.season === 'kharif' ? 'खरीफ' : cs.season === 'rabi' ? 'रबी' : 'ज़ायद'} फसल
   📅 बुवाई: ${sowStr} | कटाई: ${harvStr}
   💧 पानी: ${cs.waterRequirement === 'low' ? 'कम' : cs.waterRequirement === 'medium' ? 'मध्यम' : 'अधिक'}
   📊 उपज: ${cs.avgYieldPerAcre}
   💡 सुझाव: ${cs.tipsHi.split('.')[0]}.`
    }

    return `${i + 1}. ${cs.crop} — ${cs.season.charAt(0).toUpperCase() + cs.season.slice(1)} season
   📅 Sow: ${sowStr} | Harvest: ${harvStr}
   💧 Water: ${cs.waterRequirement.charAt(0).toUpperCase() + cs.waterRequirement.slice(1)}
   📊 Yield: ${cs.avgYieldPerAcre}
   💡 Tip: ${cs.tips.split('.')[0]}.`
  })

  return header + items.join('\n\n')
}

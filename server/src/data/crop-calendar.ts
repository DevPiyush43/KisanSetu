export interface CropSeason {
  crop: string
  season: 'kharif' | 'rabi' | 'zaid'
  sowingMonths: number[]
  harvestMonths: number[]
  idealDistricts: string[]
  soilTypes: string[]
  waterRequirement: 'low' | 'medium' | 'high'
  durationDays: number
  avgYieldPerAcre: string
  tips: string
  tipsHi: string
}

export const CROP_CALENDAR: CropSeason[] = [
  {
    crop: 'Wheat',
    season: 'rabi',
    sowingMonths: [10, 11],
    harvestMonths: [3, 4],
    idealDistricts: ['Indore', 'Bhopal', 'Jaipur'],
    soilTypes: ['alluvial', 'black'],
    waterRequirement: 'medium',
    durationDays: 120,
    avgYieldPerAcre: '15-20 quintals',
    tips: 'Use HD-2967 or PBW-343 variety for best yield. Irrigate at crown root initiation stage (21 days). Apply 120 kg/ha nitrogen in split doses.',
    tipsHi: 'सबसे अच्छी उपज के लिए HD-2967 या PBW-343 किस्म का उपयोग करें। 21 दिन पर क्राउन रूट शुरू होने पर सिंचाई करें। 120 kg/ha नाइट्रोजन दो चरणों में दें।',
  },
  {
    crop: 'Paddy',
    season: 'kharif',
    sowingMonths: [6, 7],
    harvestMonths: [10, 11],
    idealDistricts: ['Bhopal', 'Nagpur'],
    soilTypes: ['alluvial', 'black'],
    waterRequirement: 'high',
    durationDays: 130,
    avgYieldPerAcre: '20-25 quintals',
    tips: 'Use SRI method for 20% more yield with 50% less water. Transplant at 14-day seedling age. Maintain 2-3 cm water depth during tillering.',
    tipsHi: '50% कम पानी में 20% अधिक उपज के लिए SRI विधि अपनाएं। 14 दिन की पौध रोपाई करें। कल्लेदार अवस्था में 2-3 सेमी जल स्तर बनाए रखें।',
  },
  {
    crop: 'Cotton',
    season: 'kharif',
    sowingMonths: [4, 5, 6],
    harvestMonths: [10, 11, 12],
    idealDistricts: ['Nagpur', 'Jaipur'],
    soilTypes: ['black'],
    waterRequirement: 'medium',
    durationDays: 180,
    avgYieldPerAcre: '6-8 quintals',
    tips: 'Use Bt cotton for bollworm resistance. Apply first irrigation 45 days after sowing. Monitor for whitefly and pink bollworm after August.',
    tipsHi: 'बॉलवर्म प्रतिरोध के लिए Bt कपास का उपयोग करें। बुवाई के 45 दिन बाद पहली सिंचाई करें। अगस्त के बाद सफेद मक्खी और पिंक बॉलवर्म पर नजर रखें।',
  },
  {
    crop: 'Soybean',
    season: 'kharif',
    sowingMonths: [6, 7],
    harvestMonths: [10, 11],
    idealDistricts: ['Indore', 'Bhopal', 'Nagpur'],
    soilTypes: ['black', 'alluvial'],
    waterRequirement: 'medium',
    durationDays: 100,
    avgYieldPerAcre: '8-12 quintals',
    tips: 'Use JS-335 or JS-9560 variety. Treat seeds with Rhizobium culture before sowing. Avoid waterlogging — ensure good drainage.',
    tipsHi: 'JS-335 या JS-9560 किस्म का उपयोग करें। बुवाई से पहले बीजों को राइजोबियम कल्चर से उपचारित करें। जलभराव से बचें — अच्छी जल निकासी सुनिश्चित करें।',
  },
  {
    crop: 'Tomato',
    season: 'zaid',
    sowingMonths: [1, 2, 7, 8],
    harvestMonths: [4, 5, 10, 11],
    idealDistricts: ['Pune', 'Nagpur', 'Indore'],
    soilTypes: ['alluvial', 'red', 'sandy'],
    waterRequirement: 'medium',
    durationDays: 90,
    avgYieldPerAcre: '150-200 quintals',
    tips: 'Use Pusa Ruby or Arka Vikas variety. Stake plants at 30 cm height. Apply calcium to prevent blossom end rot. Use drip irrigation for best results.',
    tipsHi: 'पूसा रूबी या अर्का विकास किस्म लगाएं। 30 सेमी ऊँचाई पर पौधों को सहारा दें। ब्लॉसम एंड रॉट रोकने के लिए कैल्शियम दें। सर्वोत्तम परिणाम के लिए ड्रिप सिंचाई का उपयोग करें।',
  },
  {
    crop: 'Mustard',
    season: 'rabi',
    sowingMonths: [10, 11],
    harvestMonths: [2, 3],
    idealDistricts: ['Jaipur', 'Bhopal', 'Indore'],
    soilTypes: ['alluvial', 'sandy', 'black'],
    waterRequirement: 'low',
    durationDays: 110,
    avgYieldPerAcre: '6-8 quintals',
    tips: 'Use RH-749 or RH-8812 variety. Sow in rows 30 cm apart. One irrigation at flowering stage is critical. Good for crop rotation with wheat.',
    tipsHi: 'RH-749 या RH-8812 किस्म का उपयोग करें। 30 सेमी की कतारों में बोएं। फूल आने पर एक सिंचाई जरूरी है। गेहूं के साथ फसल चक्र के लिए अच्छा।',
  },
  {
    crop: 'Chickpea',
    season: 'rabi',
    sowingMonths: [10, 11],
    harvestMonths: [2, 3],
    idealDistricts: ['Indore', 'Bhopal', 'Nagpur', 'Jaipur'],
    soilTypes: ['alluvial', 'black', 'red'],
    waterRequirement: 'low',
    durationDays: 100,
    avgYieldPerAcre: '8-10 quintals',
    tips: 'Treat seeds with Rhizobium + PSB before sowing. Avoid excessive nitrogen — legume fixes its own. Watch for pod borer in February.',
    tipsHi: 'बुवाई से पहले राइजोबियम + PSB से बीज उपचार करें। अधिक नाइट्रोजन से बचें — दलहन खुद नाइट्रोजन बनाती है। फरवरी में फली छेदक पर नजर रखें।',
  },
  {
    crop: 'Maize',
    season: 'kharif',
    sowingMonths: [6, 7],
    harvestMonths: [9, 10],
    idealDistricts: ['Pune', 'Nagpur', 'Bhopal'],
    soilTypes: ['alluvial', 'red', 'black'],
    waterRequirement: 'medium',
    durationDays: 90,
    avgYieldPerAcre: '20-25 quintals',
    tips: 'Use hybrid varieties (NK-6240, DKC-9144). Plant at 60×20 cm spacing. Critical irrigation at silking and grain filling stages.',
    tipsHi: 'हाइब्रिड किस्में (NK-6240, DKC-9144) का उपयोग करें। 60×20 सेमी की दूरी पर लगाएं। सिल्किंग और दाना भरने की अवस्था पर सिंचाई जरूरी।',
  },
]

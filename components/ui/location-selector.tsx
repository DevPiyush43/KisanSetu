'use client'

import { useState, useMemo } from 'react'
import { INDIAN_STATES, getDistrictsForState } from '@/lib/data/india-locations'
import { MapPin, Search, CheckCircle2 } from 'lucide-react'

interface LocationSelectorProps {
  selectedState: string
  selectedDistrict: string
  onStateChange: (state: string) => void
  onDistrictChange: (district: string) => void
  label?: string
  required?: boolean
}

export function LocationSelector({
  selectedState,
  selectedDistrict,
  onStateChange,
  onDistrictChange,
  label = 'Location',
  required = false,
}: LocationSelectorProps) {
  const [districtSearch, setDistrictSearch] = useState('')

  const districts = useMemo(() => {
    if (!selectedState) return []
    return getDistrictsForState(selectedState)
  }, [selectedState])

  const filteredDistricts = useMemo(() => {
    if (!districtSearch.trim()) return districts
    return districts.filter(d => d.toLowerCase().includes(districtSearch.toLowerCase().trim()))
  }, [districts, districtSearch])

  return (
    <div className="space-y-4">
      {label && (
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <MapPin className="w-4 h-4 text-[#2D7D32]" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* State / UT Dropdown */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
          1. Select State / UT {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            value={selectedState}
            onChange={e => {
              const newState = e.target.value
              onStateChange(newState)
              onDistrictChange('')
              setDistrictSearch('')
            }}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D7D32]/40 focus:border-[#2D7D32] cursor-pointer shadow-sm"
            required={required}
          >
            <option value="">-- Choose State / UT (28 States & 8 UTs) --</option>
            {INDIAN_STATES.map(state => (
              <option key={state.name} value={state.name}>
                {state.name} ({state.nameHi}) — {state.districts.length} Districts
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* District Selector */}
      {selectedState ? (
        <div className="bg-green-50/50 border border-green-200/70 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              2. Select District in {selectedState} ({districts.length} districts) {required && <span className="text-red-500">*</span>}
            </label>
            {selectedDistrict && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1B5E20] bg-green-100 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> {selectedDistrict}
              </span>
            )}
          </div>

          {/* Quick Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${districts.length} districts in ${selectedState}...`}
              value={districtSearch}
              onChange={e => setDistrictSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]/40 focus:border-[#2D7D32]"
            />
            {districtSearch && (
              <button
                type="button"
                onClick={() => setDistrictSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold px-1.5 py-0.5"
              >
                Clear
              </button>
            )}
          </div>

          {/* Full District Dropdown */}
          <div>
            <select
              value={selectedDistrict}
              onChange={e => onDistrictChange(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D7D32]/40 focus:border-[#2D7D32] cursor-pointer shadow-sm"
              required={required}
            >
              <option value="">-- Select Your District ({filteredDistricts.length} available) --</option>
              {filteredDistricts.map(district => (
                <option key={district} value={district}>
                  📍 {district}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Clickable Badges (Top 12 or search matches) */}
          {filteredDistricts.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-1.5">
                {districtSearch ? 'Search results (click to select):' : 'Or click directly below:'}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {filteredDistricts.slice(0, 24).map(district => {
                  const isSelected = selectedDistrict === district
                  return (
                    <button
                      key={district}
                      type="button"
                      onClick={() => onDistrictChange(district)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#2D7D32] text-white shadow-sm ring-2 ring-green-600'
                          : 'bg-white text-gray-700 border border-gray-200 hover:border-green-400 hover:bg-green-50'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}{district}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 text-center">
          👆 Please select a State / UT above first to view all districts.
        </div>
      )}
    </div>
  )
}

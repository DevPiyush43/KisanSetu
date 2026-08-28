'use client'

import { useState, useMemo } from 'react'
import { INDIAN_STATES, getDistrictsForState } from '@/lib/data/india-locations'
import { MapPin } from 'lucide-react'

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
    if (!districtSearch) return districts
    return districts.filter(d => d.toLowerCase().includes(districtSearch.toLowerCase()))
  }, [districts, districtSearch])

  return (
    <div className="space-y-3">
      {label && (
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <MapPin className="w-4 h-4 text-[#2D7D32]" />
          {label}
          {required && <span className="text-red-400">*</span>}
        </label>
      )}

      {/* State dropdown */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">State / UT</label>
        <select
          value={selectedState}
          onChange={e => {
            onStateChange(e.target.value)
            onDistrictChange('')
            setDistrictSearch('')
          }}
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]/30 focus:border-[#2D7D32] appearance-none cursor-pointer"
          required={required}
        >
          <option value="">Select State</option>
          {INDIAN_STATES.map(state => (
            <option key={state.name} value={state.name}>
              {state.name} ({state.nameHi})
            </option>
          ))}
        </select>
      </div>

      {/* District dropdown with search */}
      {selectedState && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">District ({districts.length} districts)</label>
          <input
            type="text"
            placeholder="Search district..."
            value={districtSearch}
            onChange={e => setDistrictSearch(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-t-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]/30"
          />
          <select
            value={selectedDistrict}
            onChange={e => onDistrictChange(e.target.value)}
            size={Math.min(filteredDistricts.length + 1, 6)}
            className="w-full px-4 py-1 bg-white border border-gray-200 border-t-0 rounded-b-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]/30 cursor-pointer"
            required={required}
          >
            <option value="">Select District</option>
            {filteredDistricts.map(district => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

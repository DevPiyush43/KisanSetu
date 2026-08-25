'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CROPS } from '@/lib/types'
import { cropEmoji } from '@/lib/utils'
import { toast } from 'sonner'
import { PlusCircle } from 'lucide-react'

export function CreatePoolButton({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [crop, setCrop] = useState('')
  const [name, setName] = useState('')

  const handleCreate = async () => {
    if (!crop) { toast.error('Select a crop'); return }
    setLoading(true)
    const { error } = await supabase.from('fpo_pools').insert({
      fpo_admin_id: userId,
      crop,
      name: name || `${crop} Pool`,
      status: 'open',
    })
    if (error) { toast.error('Failed to create pool'); setLoading(false); return }
    toast.success('Pool created!')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-[#2D7D32] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#1B5E20] transition-all shadow-md">
        <PlusCircle className="w-4 h-4" /> Create Pool
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Create New Pool</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Crop *</label>
                <div className="grid grid-cols-3 gap-2">
                  {CROPS.map(c => (
                    <button key={c} type="button" onClick={() => setCrop(c)}
                      className={`flex flex-col items-center py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${crop === c ? 'border-[#2D7D32] bg-[#2D7D32] text-white' : 'border-gray-200 hover:border-green-300 text-gray-700'}`}>
                      <span className="text-lg">{cropEmoji(c)}</span>
                      <span className="mt-0.5">{c}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Pool Name (optional)</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder={crop ? `${crop} Pool 2025` : 'Pool name'}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D32]" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={loading || !crop}
                  className="flex-1 bg-[#2D7D32] text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-[#1B5E20] transition-colors">
                  {loading ? 'Creating...' : 'Create Pool'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

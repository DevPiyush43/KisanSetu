import { Suspense } from 'react'
import { NewGrievanceForm } from './new-grievance-form'

export default function NewGrievancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F1F8E9] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2D7D32] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NewGrievanceForm />
    </Suspense>
  )
}

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getPatientProfile } from '@/features/patients/services/patientApi'
import AiSymptomHero from '@/features/ai-symptom/components/AiSymptomHero'

export default function PatientDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const userId = user?.id || ''

  useEffect(() => {
    if (userId) {
      getPatientProfile(userId).then(setProfile).catch(() => null)
    }
  }, [userId])

  const displayName = profile?.name || user?.name || 'there'

  return (
    <div className="max-w-6xl mx-auto pb-24 animate-in fade-in duration-500">
      <AiSymptomHero userName={displayName} />
    </div>
  )
}

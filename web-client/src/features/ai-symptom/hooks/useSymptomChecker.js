import { useState } from 'react'
import { checkSymptoms } from '@/features/ai-symptom/services/aiSymptomApi'
import {
  fetchAllDoctors,
  mapDoctorsForAi,
} from '@/features/ai-symptom/services/doctorApi'

function normalizeSpecialty(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function pickRecommendedDoctors(allDoctors, symptomResult) {
  if (!Array.isArray(allDoctors) || allDoctors.length === 0) return []

  const recommendedSpecialty = normalizeSpecialty(symptomResult?.recommendedSpecialty)
  if (!recommendedSpecialty) {
    return []
  }

  return allDoctors.filter(
    (doctor) => normalizeSpecialty(doctor?.specialty) === recommendedSpecialty,
  )
}

export function useSymptomChecker() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [recommendedDoctors, setRecommendedDoctors] = useState([])
  const [doctorLookupStatus, setDoctorLookupStatus] = useState('idle')
  const [doctorLookupError, setDoctorLookupError] = useState('')

  const submitCheck = async (payload) => {
    setLoading(true)
    setError('')
    setDoctorLookupStatus('idle')
    setDoctorLookupError('')
    setRecommendedDoctors([])

    try {
      setDoctorLookupStatus('loading')
      const allDoctors = await fetchAllDoctors()

      const aiPayload = {
        ...payload,
        availableDoctors: mapDoctorsForAi(allDoctors),
      }

      const data = await checkSymptoms(aiPayload)
      setResult(data)

      const doctorsToShow = pickRecommendedDoctors(allDoctors, data)
      setRecommendedDoctors(doctorsToShow)
      setDoctorLookupStatus('success')
      return data
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Unable to analyze symptoms right now. Please try again.'

      setDoctorLookupStatus('error')
      setDoctorLookupError('Unable to load recommended doctors right now.')
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    result,
    setResult,
    setError,
    recommendedDoctors,
    doctorLookupStatus,
    doctorLookupError,
    submitCheck,
  }
}

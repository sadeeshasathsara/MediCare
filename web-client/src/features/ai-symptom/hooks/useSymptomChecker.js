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
    return allDoctors.slice(0, 3)
  }

  // Exact match
  const matches = allDoctors.filter(
    (doctor) => normalizeSpecialty(doctor?.specialty) === recommendedSpecialty,
  )
  
  if (matches.length > 0) {
    return matches
  }

  // Fallback 1: Try to match "General Practice"
  const generalMatches = allDoctors.filter(
    (doctor) => normalizeSpecialty(doctor?.specialty).includes('general')
  )
  if (generalMatches.length > 0) {
    return generalMatches.slice(0, 3)
  }

  // Fallback 2: Just return any 3 doctors
  return allDoctors.slice(0, 3)
}

export function useSymptomChecker() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [messages, setMessages] = useState([]) // Track conversation
  const [recommendedDoctors, setRecommendedDoctors] = useState([])
  const [doctorLookupStatus, setDoctorLookupStatus] = useState('idle')
  const [doctorLookupError, setDoctorLookupError] = useState('')
  const [latestOptions, setLatestOptions] = useState([])

  const submitCheck = async (payload, currentHistory = []) => {
    setLoading(true)
    setError('')
    setLatestOptions([])
    
    // We only clear these if it's the final diagnostic step
    // but for internal state, let's keep them scoped
    setDoctorLookupStatus('idle')
    setDoctorLookupError('')

    try {
      const allDoctors = await fetchAllDoctors()

      const aiPayload = {
        ...payload,
        history: currentHistory,
        availableDoctors: mapDoctorsForAi(allDoctors),
      }

      const data = await checkSymptoms(aiPayload)
      
      // Update the messages state with the AI's response
      const aiMessage = { role: 'assistant', content: data.aiMessage }
      setMessages(prev => [...prev, aiMessage])

      if (data.isDiagnostic) {
        setResult(data)
        const doctorsToShow = pickRecommendedDoctors(allDoctors, data)
        setRecommendedDoctors(doctorsToShow)
        setDoctorLookupStatus('success')
        setLatestOptions([]) // No options when diagnostic
      } else {
        // Store options for follow-up chips
        setLatestOptions(data.options || [])
      }
      
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
    messages,
    setMessages,
    recommendedDoctors,
    doctorLookupStatus,
    doctorLookupError,
    latestOptions,
    submitCheck,
  }
}

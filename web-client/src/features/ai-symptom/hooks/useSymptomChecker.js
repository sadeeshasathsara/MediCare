import { useState } from 'react'
import { checkSymptoms } from '@/features/ai-symptom/services/aiSymptomApi'

export function useSymptomChecker() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const submitCheck = async (payload) => {
    setLoading(true)
    setError('')

    try {
      const data = await checkSymptoms(payload)
      setResult(data)
      return data
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Unable to analyze symptoms right now. Please try again.'
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
    submitCheck,
  }
}

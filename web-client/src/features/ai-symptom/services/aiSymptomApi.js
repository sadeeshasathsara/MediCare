import api from '@/services/api'

export async function checkSymptoms(payload) {
  const response = await api.post('/ai/symptom-check', payload)
  return response.data
}

import api from '@/services/api'

function normalizeUrgencyLevel(value) {
  const normalized = String(value || '').trim().toUpperCase()
  if (['LOW', 'MODERATE', 'HIGH', 'EMERGENCY'].includes(normalized)) {
    return normalized
  }
  return 'MODERATE'
}

function normalizeConditions(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => Boolean(item))
}

function normalizeRecommendedDoctorIds(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || '').trim())
    .filter((item) => Boolean(item))
}

function mapSymptomResponse(raw) {
  return {
    aiMessage: raw?.aiMessage || '',
    isDiagnostic: Boolean(raw?.isDiagnostic),
    options: Array.isArray(raw?.options) ? raw.options.filter(o => typeof o === 'string' && o.trim()) : [],
    possibleConditions: normalizeConditions(raw?.possibleConditions),
    recommendedSpecialty: String(raw?.recommendedSpecialty || 'General Practice'),
    recommendedDoctor: String(raw?.recommendedDoctor || 'General Physician'),
    recommendedDoctorIds: normalizeRecommendedDoctorIds(raw?.recommendedDoctorIds),
    urgencyLevel: normalizeUrgencyLevel(raw?.urgencyLevel),
    advice: String(raw?.advice || 'Please consult a licensed clinician for further guidance.'),
    disclaimer: String(
      raw?.disclaimer || 'This response is AI-generated and is not a medical diagnosis. For medical advice, consult a licensed doctor.',
    ),
  }
}

export async function checkSymptoms(payload) {
  const response = await api.post('/ai/symptom-check', payload)
  return mapSymptomResponse(response.data)
}

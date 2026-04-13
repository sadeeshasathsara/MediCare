import api from '@/services/api'

const TELEMEDICINE_BASE = '/telemedicine/api/v1'

function unwrapEnvelope(response, fallbackValue = null) {
  const payload = response?.data
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data ?? fallbackValue
  }
  return payload ?? fallbackValue
}

function withQuery(path, params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `${path}?${queryString}` : path
}

export async function listAppointments(params = {}) {
  const response = await api.get(withQuery(`${TELEMEDICINE_BASE}/appointments`, params))
  return unwrapEnvelope(response, [])
}

export async function getAppointment(appointmentId) {
  const response = await api.get(`${TELEMEDICINE_BASE}/appointments/${appointmentId}`)
  return unwrapEnvelope(response)
}

export async function acceptAppointment(appointmentId) {
  const response = await api.patch(`${TELEMEDICINE_BASE}/appointments/${appointmentId}/accept`)
  return unwrapEnvelope(response)
}

export async function rejectAppointment(appointmentId, reason) {
  const response = await api.patch(`${TELEMEDICINE_BASE}/appointments/${appointmentId}/reject`, { reason })
  return unwrapEnvelope(response)
}

export async function rescheduleAppointment(appointmentId, payload) {
  const response = await api.patch(`${TELEMEDICINE_BASE}/appointments/${appointmentId}/reschedule`, payload)
  return unwrapEnvelope(response)
}

export async function listUpcomingAppointments(params = {}) {
  const response = await api.get(withQuery(`${TELEMEDICINE_BASE}/appointments/upcoming`, params))
  return unwrapEnvelope(response, [])
}

export async function syncAppointment(payload) {
  const response = await api.post(`${TELEMEDICINE_BASE}/appointments/sync`, payload)
  return unwrapEnvelope(response)
}

export async function listSessions(params = {}) {
  const response = await api.get(withQuery(`${TELEMEDICINE_BASE}/sessions`, params))
  return unwrapEnvelope(response, [])
}

export async function getSession(sessionId) {
  const response = await api.get(`${TELEMEDICINE_BASE}/sessions/${sessionId}`)
  return unwrapEnvelope(response)
}

export async function createSession(appointmentId) {
  const response = await api.post(`${TELEMEDICINE_BASE}/sessions`, { appointmentId })
  return unwrapEnvelope(response)
}

export async function getJoinToken(sessionId, role, markJoined = false) {
  const response = await api.get(withQuery(`${TELEMEDICINE_BASE}/sessions/${sessionId}/join-token`, { role, markJoined }))
  return unwrapEnvelope(response)
}

export async function getSessionReady(sessionId) {
  const response = await api.get(`${TELEMEDICINE_BASE}/sessions/${sessionId}/ready`)
  return unwrapEnvelope(response)
}

export async function startSession(sessionId) {
  const response = await api.patch(`${TELEMEDICINE_BASE}/sessions/${sessionId}/start`)
  return unwrapEnvelope(response)
}

export async function endSession(sessionId) {
  const response = await api.patch(`${TELEMEDICINE_BASE}/sessions/${sessionId}/end`)
  return unwrapEnvelope(response)
}

export async function listConsultations(params = {}) {
  const response = await api.get(withQuery(`${TELEMEDICINE_BASE}/consultations`, params))
  return unwrapEnvelope(response, [])
}

export async function createConsultation(payload) {
  const response = await api.post(`${TELEMEDICINE_BASE}/consultations`, payload)
  return unwrapEnvelope(response)
}

export async function updateConsultation(consultationId, payload) {
  const response = await api.patch(`${TELEMEDICINE_BASE}/consultations/${consultationId}`, payload)
  return unwrapEnvelope(response)
}

export async function listPrescriptions(params = {}) {
  const response = await api.get(withQuery(`${TELEMEDICINE_BASE}/prescriptions`, params))
  return unwrapEnvelope(response, [])
}

export async function createPrescription(payload) {
  const response = await api.post(`${TELEMEDICINE_BASE}/prescriptions`, payload)
  return unwrapEnvelope(response)
}

export async function updatePrescriptionStatus(prescriptionId, status) {
  const response = await api.patch(`${TELEMEDICINE_BASE}/prescriptions/${prescriptionId}/status`, { status })
  return unwrapEnvelope(response)
}

export async function cancelPrescription(prescriptionId) {
  const response = await api.patch(`${TELEMEDICINE_BASE}/prescriptions/${prescriptionId}/cancel`)
  return unwrapEnvelope(response)
}

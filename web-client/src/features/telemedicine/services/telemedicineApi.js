import api from '@/services/api'

// NOTE: The API gateway exposes telemedicine as `/api/telemedicine/*` and rewrites it to
// the telemedicine-service native `/api/v1/*`. Therefore the frontend must NOT include
// `/api/v1` here, otherwise it becomes `/api/v1/api/v1/*` upstream.
const TELEMEDICINE_BASE = '/telemedicine'
const RESCHEDULE_PREFIX = '[telemedicine-rescheduled]'

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

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function hasRescheduleMarker(notes) {
  return normalizeText(notes).startsWith(RESCHEDULE_PREFIX)
}

function mapAppointmentStatus(status, notes) {
  const normalizedStatus = String(status || '').toUpperCase()
  if (normalizedStatus === 'CONFIRMED') return 'ACCEPTED'
  if (normalizedStatus === 'COMPLETED') return 'COMPLETED'
  if (normalizedStatus === 'CANCELLED') return 'REJECTED'
  if (normalizedStatus === 'PENDING' && hasRescheduleMarker(notes)) return 'RESCHEDULED'
  return 'PENDING'
}

function extractRescheduleReason(notes) {
  const normalized = String(notes || '').trim()
  if (!hasRescheduleMarker(normalized)) return null
  if (normalized.length <= RESCHEDULE_PREFIX.length) return 'Rescheduled by doctor'

  const reason = normalized.slice(RESCHEDULE_PREFIX.length).trim()
  return reason || 'Rescheduled by doctor'
}

function mapAppointment(appointment) {
  const rawStatus = String(appointment?.status || '').toUpperCase()
  const hasNativeTelemedicineStatus = ['PENDING', 'ACCEPTED', 'REJECTED', 'RESCHEDULED', 'COMPLETED'].includes(rawStatus)
  const mappedStatus = hasNativeTelemedicineStatus
    ? rawStatus
    : mapAppointmentStatus(appointment?.status, appointment?.notes)

  return {
    id: appointment?.id,
    patientId: appointment?.patientId,
    doctorId: appointment?.doctorId,
    patientName: appointment?.patientName || '',
    doctorName: appointment?.doctorName || '',
    doctorSpecialty: appointment?.doctorSpecialty || '',
    scheduledAt: appointment?.scheduledAt,
    status: mappedStatus,
    reasonForVisit: appointment?.reasonForVisit || appointment?.reason || '',
    notes: appointment?.notes || '',
    rejectionReason: appointment?.rejectionReason || (mappedStatus === 'REJECTED' ? (appointment?.notes || '') : null),
    rescheduleReason: appointment?.rescheduleReason || extractRescheduleReason(appointment?.notes),
    proposedScheduledAt: appointment?.proposedScheduledAt || (mappedStatus === 'RESCHEDULED' ? (appointment?.scheduledAt || null) : null),
    createdAt: appointment?.createdAt || null,
    updatedAt: appointment?.updatedAt || null,
  }
}

function mapTelemedicineAppointments(appointments) {
  return (Array.isArray(appointments) ? appointments : []).map(mapAppointment)
}

export async function listAppointments(params = {}) {
  const response = await api.get(withQuery(`${TELEMEDICINE_BASE}/appointments`, params))
  return mapTelemedicineAppointments(unwrapEnvelope(response, []))
}

export async function getAppointment(appointmentId) {
  const response = await api.get(`${TELEMEDICINE_BASE}/appointments/${appointmentId}`)
  const appointment = unwrapEnvelope(response)
  return appointment ? mapAppointment(appointment) : null
}

export async function acceptAppointment(appointmentId) {
  const response = await api.patch(`${TELEMEDICINE_BASE}/appointments/${appointmentId}/accept`)
  return mapAppointment(unwrapEnvelope(response))
}

export async function rejectAppointment(appointmentId, reason) {
  const response = await api.patch(`${TELEMEDICINE_BASE}/appointments/${appointmentId}/reject`, {
    reason,
  })
  return mapAppointment(unwrapEnvelope(response))
}

export async function rescheduleAppointment(appointmentId, payload) {
  const scheduledAt = payload?.newScheduledAt || payload?.scheduledAt || ''
  const reason = String(payload?.reason || '').trim()

  const response = await api.patch(`${TELEMEDICINE_BASE}/appointments/${appointmentId}/reschedule`, {
    newScheduledAt: scheduledAt,
    reason: reason || 'Rescheduled by doctor',
  })
  return mapAppointment(unwrapEnvelope(response))
}

export async function listUpcomingAppointments(params = {}) {
  const response = await api.get(withQuery(`${TELEMEDICINE_BASE}/appointments/upcoming`, params))
  return mapTelemedicineAppointments(unwrapEnvelope(response, []))
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

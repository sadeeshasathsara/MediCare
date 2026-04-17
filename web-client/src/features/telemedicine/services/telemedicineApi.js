import api from '@/services/api'

const TELEMEDICINE_BASE = '/telemedicine'
const APPOINTMENT_GATEWAY_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
const APPOINTMENT_ABSOLUTE_BASE = import.meta.env.VITE_APPOINTMENT_API_BASE_URL || `${APPOINTMENT_GATEWAY_BASE}/appointments`
const APPOINTMENT_ABSOLUTE_BASE_FALLBACK = import.meta.env.VITE_APPOINTMENT_API_BASE_URL_FALLBACK || `${APPOINTMENT_GATEWAY_BASE}/appointments`
const RETRYABLE_APPOINTMENT_STATUSES = new Set([500, 502, 503, 504])
const APPOINTMENT_RETRY_DELAY_MS = 1200
const APPOINTMENT_MAX_ATTEMPTS = 2
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

function isNotFound(error) {
  return Number(error?.response?.status) === 404
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

function isRetryableAppointmentError(error) {
  const status = Number(error?.response?.status)
  if (RETRYABLE_APPOINTMENT_STATUSES.has(status)) return true
  return !error?.response
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function requestAppointmentService(method, path, configOrBody) {
  const candidates = [
    `${trimTrailingSlash(APPOINTMENT_ABSOLUTE_BASE)}${path}`,
    `${trimTrailingSlash(APPOINTMENT_ABSOLUTE_BASE_FALLBACK)}${path}`,
  ].filter(Boolean)

  const uniqueCandidates = Array.from(new Set(candidates))
  let lastError = null

  for (const candidate of uniqueCandidates) {
    for (let attempt = 1; attempt <= APPOINTMENT_MAX_ATTEMPTS; attempt += 1) {
      try {
        if (method === 'get') {
          return await api.get(candidate, configOrBody)
        }
        if (method === 'put') {
          return await api.put(candidate, configOrBody)
        }
        if (method === 'patch') {
          return await api.patch(candidate, configOrBody)
        }
        throw new Error(`Unsupported method: ${method}`)
      } catch (error) {
        lastError = error
        if (isNotFound(error)) {
          break
        }
        if (isRetryableAppointmentError(error) && attempt < APPOINTMENT_MAX_ATTEMPTS) {
          await delay(APPOINTMENT_RETRY_DELAY_MS)
          continue
        }
        throw error
      }
    }
  }

  throw lastError || new Error('Appointment service request failed.')
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
  const mappedStatus = mapAppointmentStatus(appointment?.status, appointment?.notes)
  return {
    id: appointment?.id,
    patientId: appointment?.patientId,
    doctorId: appointment?.doctorId,
    patientName: appointment?.patientName || '',
    doctorName: appointment?.doctorName || '',
    doctorSpecialty: appointment?.doctorSpecialty || '',
    scheduledAt: appointment?.scheduledAt,
    status: mappedStatus,
    reasonForVisit: appointment?.reason || '',
    notes: appointment?.notes || '',
    rejectionReason: mappedStatus === 'REJECTED' ? (appointment?.notes || '') : null,
    rescheduleReason: extractRescheduleReason(appointment?.notes),
    proposedScheduledAt: mappedStatus === 'RESCHEDULED' ? (appointment?.scheduledAt || null) : null,
    createdAt: appointment?.createdAt || null,
    updatedAt: appointment?.updatedAt || null,
  }
}

function mapTelemedicineAppointments(appointments) {
  return (Array.isArray(appointments) ? appointments : []).map(mapAppointment)
}

export async function listAppointments(params = {}) {
  const response = await requestAppointmentService('get', withQuery('', params))
  return mapTelemedicineAppointments(unwrapEnvelope(response, []))
}

export async function getAppointment(appointmentId) {
  const response = await requestAppointmentService('get', `/${appointmentId}`)
  const appointment = unwrapEnvelope(response)
  return appointment ? mapAppointment(appointment) : null
}

export async function acceptAppointment(appointmentId) {
  const response = await requestAppointmentService('patch', `/${appointmentId}/status`, {
    status: 'CONFIRMED',
  })
  return mapAppointment(unwrapEnvelope(response))
}

export async function rejectAppointment(appointmentId, reason) {
  const response = await requestAppointmentService('patch', `/${appointmentId}/status`, {
    status: 'CANCELLED',
    notes: reason,
  })
  return mapAppointment(unwrapEnvelope(response))
}

export async function rescheduleAppointment(appointmentId, payload) {
  const scheduledAt = payload?.newScheduledAt || payload?.scheduledAt || ''
  const reason = String(payload?.reason || '').trim()

  await requestAppointmentService('put', `/${appointmentId}`, { scheduledAt })
  const response = await requestAppointmentService('patch', `/${appointmentId}/status`, {
    status: 'PENDING',
    notes: reason ? `${RESCHEDULE_PREFIX} ${reason}` : RESCHEDULE_PREFIX,
  })
  return mapAppointment(unwrapEnvelope(response))
}

export async function listUpcomingAppointments(params = {}) {
  const appointments = await listAppointments(params)
  const now = Date.now()
  return appointments.filter((appointment) => {
    if (appointment.status !== 'ACCEPTED') return false
    const scheduledTime = new Date(appointment.scheduledAt || '').getTime()
    return Number.isFinite(scheduledTime) && scheduledTime > now
  })
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

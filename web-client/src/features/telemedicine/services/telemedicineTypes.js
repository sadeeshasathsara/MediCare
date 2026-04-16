export const APPOINTMENT_STATUSES = ['PENDING', 'ACCEPTED', 'RESCHEDULED', 'REJECTED']
export const SESSION_STATUSES = ['SCHEDULED', 'WAITING', 'LIVE', 'COMPLETED', 'MISSED', 'CANCELLED']
export const PRESCRIPTION_STATUSES = ['DRAFT', 'ISSUED', 'DISPENSED', 'CANCELLED']
export const READY_POLL_STATUSES = new Set(['SCHEDULED', 'WAITING', 'LIVE'])
export const SEEDED_TELEMEDICINE_PATIENT = {
  profileId: '69d1ec55acc43c5456fe30a2',
  userId: '69cd4dc01d72c817c641a3e3',
  name: 'Sadeesha Sathsara',
  email: 'sadeesha.patient@gmail.com',
  dob: '2003-06-21',
  status: 'ACTIVE',
}

const PREFERRED_APPOINTMENT_ORDER = ['PENDING', 'ACCEPTED', 'RESCHEDULED']

/**
 * @typedef {{
 *   id: string,
 *   patientId: string,
 *   doctorId: string,
 *   scheduledAt: string,
 *   status: string,
 *   reasonForVisit?: string,
 *   notes?: string,
 *   rejectionReason?: string,
 *   rescheduleReason?: string,
 *   proposedScheduledAt?: string,
 *   patientDisplay?: TelemedicinePatientDisplay,
 *   doctorDisplay?: TelemedicineDoctorDisplay
 * }} TelemedicineAppointment
 */

/**
 * @typedef {{
 *   userId: string,
 *   name: string,
 *   email?: string,
 *   dob?: string,
 *   status?: string,
 *   knownPatient: boolean
 * }} TelemedicinePatientDisplay
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   email?: string,
 *   role?: string,
 *   doctorVerified?: boolean,
 *   knownDoctor: boolean
 * }} TelemedicineDoctorDisplay
 */

/**
 * @typedef {{
 *   id: string,
 *   appointmentId: string,
 *   patientId: string,
 *   doctorId: string,
 *   scheduledAt: string,
 *   jitsiRoomId: string,
 *   jitsiRoomToken?: string,
 *   sessionStatus: string,
 *   startedAt?: string,
 *   endedAt?: string,
 *   durationSeconds?: number,
 *   doctorJoinedAt?: string,
 *   patientJoinedAt?: string
 * }} TelemedicineSession
 */

/**
 * @typedef {{
 *   sessionId: string,
 *   roomId: string,
 *   jitsiDomain: string,
 *   role: string,
 *   token?: string,
 *   expiresAt?: string,
 *   publicRoom?: boolean
 * }} TelemedicineJoinInfo
 */

/**
 * @typedef {{
 *   id: string,
 *   sessionId: string,
 *   appointmentId: string,
 *   patientId: string,
 *   doctorId: string,
 *   doctorNotes: string,
 *   diagnosis: string,
 *   followUpDate?: string
 * }} TelemedicineConsultation
 */

/**
 * @typedef {{
 *   name: string,
 *   dosage: string,
 *   frequency: string,
 *   durationDays: number,
 *   instructions?: string
 * }} TelemedicineMedication
 */

/**
 * @typedef {{
 *   id: string,
 *   consultationId: string,
 *   patientId: string,
 *   doctorId: string,
 *   issuedAt: string,
 *   expiresAt: string,
 *   medications: TelemedicineMedication[],
 *   prescriptionStatus: string
 * }} TelemedicinePrescription
 */

export function humanizeStatus(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

export function formatDateTime(value) {
  if (!value) return 'Not set'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatDate(value) {
  if (!value) return 'Not set'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(date)
}

export function formatDuration(seconds) {
  if (seconds == null) return 'Not started'
  if (seconds < 60) return `${seconds}s`

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  }

  return `${minutes}m ${remainingSeconds}s`
}

export function toDateTimeLocalValue(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  const localDate = new Date(date.getTime() - offsetMs)
  return localDate.toISOString().slice(0, 16)
}

export function toIsoStringFromLocalValue(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString()
}

export function nextLocalDateTimeValue(minutesAhead = 30) {
  const date = new Date(Date.now() + minutesAhead * 60 * 1000)
  return toDateTimeLocalValue(date.toISOString())
}

export function buildJitsiOrigin(domain) {
  const normalized = String(domain || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')

  return normalized ? `https://${normalized}` : ''
}

export function buildJitsiConfigHash() {
  const configParams = new URLSearchParams({
    'config.prejoinConfig.enabled': 'false',
    'config.prejoinPageEnabled': 'false',
    'config.requireDisplayName': 'false',
    'config.disableDeepLinking': 'true',
  })

  return configParams.toString()
}

export function buildJitsiRoomUrl(domain, roomId, token) {
  const origin = buildJitsiOrigin(domain)
  if (!origin || !roomId) return ''

  const roomUrl = `${origin}/${encodeURIComponent(roomId)}`
  const searchParams = new URLSearchParams()
  if (token) {
    searchParams.set('jwt', token)
  }

  const queryString = searchParams.toString()
  const configHash = buildJitsiConfigHash()
  return `${roomUrl}${queryString ? `?${queryString}` : ''}${configHash ? `#${configHash}` : ''}`
}

export function pickPreferredAppointment(appointments) {
  if (!appointments?.length) return null

  for (const status of PREFERRED_APPOINTMENT_ORDER) {
    const match = appointments.find((appointment) => appointment.status === status)
    if (match) return match
  }

  return appointments[0]
}

export function getSessionStateCopy(sessionStatus) {
  switch (sessionStatus) {
    case 'SCHEDULED':
      return 'Session created. Doctor can generate join access when ready.'
    case 'WAITING':
      return 'One participant has joined. Waiting for the other side.'
    case 'LIVE':
      return 'Consultation is currently live.'
    case 'COMPLETED':
      return 'Session ended. You can complete consultation notes and prescriptions.'
    case 'MISSED':
      return 'The session expired before it started.'
    case 'CANCELLED':
      return 'The session was cancelled because the appointment changed.'
    default:
      return 'Select an appointment to begin.'
  }
}

export function resolveTelemedicinePatient(patientId) {
  if (
    patientId === SEEDED_TELEMEDICINE_PATIENT.userId ||
    patientId === SEEDED_TELEMEDICINE_PATIENT.profileId
  ) {
    return {
      ...SEEDED_TELEMEDICINE_PATIENT,
      knownPatient: true,
    }
  }

  return {
    userId: patientId || 'Unknown patient',
    name: patientId ? `Patient ${patientId}` : 'Unknown patient',
    email: '',
    dob: '',
    status: 'Unknown',
    knownPatient: false,
  }
}

export function getTelemedicinePatientIdentifiers(user) {
  const identifiers = new Set()
  const normalizedEmail = String(user?.email || '').toLowerCase()
  const addIdentifier = (value) => {
    if (value === undefined || value === null) return
    const normalized = String(value).trim()
    if (!normalized) return
    identifiers.add(normalized)
  }

  const directCandidates = [
    user?.id,
    user?.userId,
    user?._id,
    user?.patientId,
    user?.patientID,
    user?.profileId,
  ]
  directCandidates.forEach(addIdentifier)

  const nestedCandidates = [
    user?.patient?.id,
    user?.patient?.userId,
    user?.patient?._id,
    user?.profile?.id,
    user?.profile?.userId,
    user?.profile?._id,
  ]
  nestedCandidates.forEach(addIdentifier)

  const isSeededPatientById = Array.from(identifiers).some((value) => (
    value === SEEDED_TELEMEDICINE_PATIENT.userId ||
    value === SEEDED_TELEMEDICINE_PATIENT.profileId
  ))

  const isSeededPatientByEmail =
    normalizedEmail &&
    normalizedEmail === String(SEEDED_TELEMEDICINE_PATIENT.email || '').toLowerCase()

  if (isSeededPatientById || isSeededPatientByEmail) {
    identifiers.add(SEEDED_TELEMEDICINE_PATIENT.userId)
    identifiers.add(SEEDED_TELEMEDICINE_PATIENT.profileId)
  }

  return Array.from(identifiers)
}

export function appointmentBelongsToPatient(appointment, user) {
  const appointmentPatientId = appointment?.patientId
  if (!appointmentPatientId) return false

  const knownIdentifiers = getTelemedicinePatientIdentifiers(user)
  return knownIdentifiers.includes(appointmentPatientId)
}

export function resolveTelemedicineDoctor(user, fallbackDoctorId) {
  const resolvedId = user?.id || fallbackDoctorId || 'Unknown doctor'

  return {
    id: resolvedId,
    name: user?.name || (resolvedId === 'Unknown doctor' ? 'Unknown doctor' : 'Doctor'),
    email: user?.email || '',
    role: user?.role || 'DOCTOR',
    doctorVerified: Boolean(user?.doctorVerified),
    knownDoctor: Boolean(user?.id || user?.email || user?.name),
  }
}

export function enrichTelemedicineAppointment(appointment, user, fallbackDoctorId) {
  return {
    ...appointment,
    patientDisplay: resolveTelemedicinePatient(appointment?.patientId),
    doctorDisplay: resolveTelemedicineDoctor(user, appointment?.doctorId || fallbackDoctorId),
  }
}

export function createEmptyMedication() {
  return {
    name: '',
    dosage: '',
    frequency: '',
    durationDays: 5,
    instructions: '',
  }
}

export function getErrorMessage(error, fallback = 'Something went wrong.') {
  const messageFromServer = error?.response?.data?.message || error?.response?.data?.error
  if (typeof messageFromServer === 'string' && messageFromServer.trim()) {
    return messageFromServer
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message
  }

  return fallback
}

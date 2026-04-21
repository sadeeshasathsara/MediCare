export function isNotificationRead(notification) {
  return Boolean(notification?.read || notification?.isRead || notification?.readAt)
}

export function getNotificationTemplateData(notification) {
  const data = notification?.templateData
  if (!data || typeof data !== 'object') return {}
  return data
}

export function getAppointmentReason(notification) {
  const data = getNotificationTemplateData(notification)
  const candidates = [
    data.appointmentReason,
    data.reasonForVisit,
    notification?.summary,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return 'Appointment activity update'
}

export function getCounterpartName(notification, userRole) {
  const data = getNotificationTemplateData(notification)
  const isDoctor = userRole === 'DOCTOR'
  const candidates = isDoctor
    ? [data.patientName, data.counterpartName]
    : [data.doctorName, data.counterpartName]

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return isDoctor ? 'Patient' : 'Doctor'
}

export function getEventLabel(eventType) {
  const key = String(eventType || '').toUpperCase()
  const map = {
    APPOINTMENT_REQUESTED: 'Requested',
    APPOINTMENT_CONFIRMED: 'Confirmed',
    APPOINTMENT_RESCHEDULED: 'Rescheduled',
    APPOINTMENT_CANCELLED: 'Cancelled',
    APPOINTMENT_COMPLETED: 'Completed',
    CONSULTATION_COMPLETED: 'Consultation Completed',
    TELEMEDICINE_APPOINTMENT_ACCEPTED: 'Telemedicine Accepted',
    TELEMEDICINE_APPOINTMENT_REJECTED: 'Telemedicine Rejected',
    TELEMEDICINE_APPOINTMENT_RESCHEDULED: 'Telemedicine Rescheduled',
    TELEMEDICINE_CONSULTATION_COMPLETED: 'Telemedicine Completed',
    TELEMEDICINE_PRESCRIPTION_ISSUED: 'Prescription Issued',
  }
  return map[key] || 'Update'
}

export function getNotificationTargetPath(notification, userRole) {
  const appointmentId = notification?.appointmentId
  const rolePrefix = userRole === 'DOCTOR' ? '/doctor' : '/patient'
  const eventType = String(notification?.eventType || '')

  if (appointmentId && eventType.startsWith('TELEMEDICINE_')) {
    return `${rolePrefix}/telemedicine/${appointmentId}`
  }
  if (appointmentId && userRole === 'DOCTOR') {
    return '/doctor/appointments'
  }
  if (appointmentId && userRole === 'PATIENT') {
    return '/patient/dashboard'
  }
  return `${rolePrefix}/notifications`
}

export function formatNotificationTime(value) {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}


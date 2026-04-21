import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { RefreshCcw } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { getAuthItem } from '@/services/authStorage'
import AppointmentDetailsPanel from '@/features/telemedicine/components/AppointmentDetailsPanel'
import ConsultationWorkspaceHeader from '@/features/telemedicine/components/ConsultationWorkspaceHeader'
import AppointmentInbox from '@/features/telemedicine/components/AppointmentInbox'
import ClinicalWrapUpPanel from '@/features/telemedicine/components/ClinicalWrapUpPanel'
import FeatureNotice from '@/features/telemedicine/components/FeatureNotice'
import LiveConsultationPanel from '@/features/telemedicine/components/LiveConsultationPanel'
import SessionControlPanel from '@/features/telemedicine/components/SessionControlPanel'
import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import TelemedicineSection from '@/features/telemedicine/components/TelemedicineSection'
import {
  acceptAppointment,
  cancelPrescription,
  createConsultation,
  createPrescription,
  createSession,
  endSession,
  getJoinToken,
  getSessionReady,
  listAppointments,
  listConsultations,
  listPrescriptions,
  listSessions,
  rejectAppointment,
  rescheduleAppointment,
  startSession,
  updateConsultation,
  updatePrescriptionStatus,
} from '@/features/telemedicine/services/telemedicineApi'
import {
  enrichTelemedicineAppointment,
  getErrorMessage,
  READY_POLL_STATUSES,
  resolveTelemedicineDoctor,
  toIsoStringFromLocalValue,
} from '@/features/telemedicine/services/telemedicineTypes'

const EMPTY_ACTION_STATE = {
  kind: '',
  loading: false,
  error: '',
  success: '',
}

function decodeJwtSubject(token) {
  try {
    const parts = String(token || '').split('.')
    if (parts.length < 2) return null

    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const remainder = payload.length % 4
    if (remainder === 2) payload += '=='
    if (remainder === 3) payload += '='

    const decodedPayload = JSON.parse(atob(payload))
    return decodedPayload?.sub || null
  } catch {
    return null
  }
}

function safeJsonParse(value) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function normalizeId(value) {
  if (value === undefined || value === null) return ''
  const next = String(value).trim()
  return next
}

function resolveDoctorIdFromUserLike(userLike) {
  if (!userLike || typeof userLike !== 'object') return ''

  const directCandidates = [
    userLike.id,
    userLike.userId,
    userLike._id,
    userLike.doctorId,
    userLike.doctorID,
    userLike.profileId,
  ]

  for (const candidate of directCandidates) {
    const normalized = normalizeId(candidate)
    if (normalized) return normalized
  }

  const nestedCandidates = [
    userLike.doctor?.id,
    userLike.doctor?.userId,
    userLike.doctor?._id,
    userLike.profile?.id,
    userLike.profile?.userId,
    userLike.profile?._id,
  ]

  for (const candidate of nestedCandidates) {
    const normalized = normalizeId(candidate)
    if (normalized) return normalized
  }

  return ''
}

function actionLoading(kind) {
  return { kind, loading: true, error: '', success: '' }
}

function actionSuccess(kind, success) {
  return { kind, loading: false, error: '', success }
}

function actionError(kind, error) {
  return { kind, loading: false, error, success: '' }
}

export default function TelemedicinePage() {
  const navigate = useNavigate()
  const { appointmentId: routeAppointmentId } = useParams()
  const [searchParams] = useSearchParams()

  const { user, accessToken } = useAuth()
  const doctorId = useMemo(() => {
    const storedUser = safeJsonParse(getAuthItem('user'))
    const fromStorage = resolveDoctorIdFromUserLike(storedUser)
    if (fromStorage) return fromStorage

    const fromAuthContext = resolveDoctorIdFromUserLike(user)
    if (fromAuthContext) return fromAuthContext

    const fromToken = decodeJwtSubject(accessToken || getAuthItem('accessToken'))
    return normalizeId(fromToken)
  }, [accessToken, user])
  const doctorDisplay = useMemo(() => resolveTelemedicineDoctor(user, doctorId), [doctorId, user])

  const [appointments, setAppointments] = useState([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [appointmentsError, setAppointmentsError] = useState('')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null)
  const selectedAppointmentIdRef = useRef(null)

  const [sessionsByAppointmentId, setSessionsByAppointmentId] = useState({})
  const [sessionLookupLoading, setSessionLookupLoading] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [readinessBySessionId, setReadinessBySessionId] = useState({})
  const [doctorJoinInfo, setDoctorJoinInfo] = useState(null)

  const [consultationsBySessionId, setConsultationsBySessionId] = useState({})
  const [prescriptionsByConsultationId, setPrescriptionsByConsultationId] = useState({})

  const [appointmentActionState, setAppointmentActionState] = useState(EMPTY_ACTION_STATE)
  const [sessionActionState, setSessionActionState] = useState(EMPTY_ACTION_STATE)
  const [consultationActionState, setConsultationActionState] = useState(EMPTY_ACTION_STATE)
  const [prescriptionActionState, setPrescriptionActionState] = useState(EMPTY_ACTION_STATE)
  const [consultationModalOpen, setConsultationModalOpen] = useState(false)

  const autoStartTriggeredRef = useRef(false)
  const autoStartRequested = searchParams.get('autostart') === '1'
  const popupMode = searchParams.get('popup') === '1'

  const enrichedAppointments = useMemo(
    () => appointments.map((appointment) => enrichTelemedicineAppointment(appointment, user, doctorId)),
    [appointments, doctorId, user]
  )
  const deferredAppointments = useDeferredValue(enrichedAppointments)
  const selectedAppointment = enrichedAppointments.find((appointment) => appointment.id === selectedAppointmentId) || null
  const selectedAppointmentKey = useMemo(() => {
    const direct = normalizeId(selectedAppointment?.id)
    if (direct) return direct

    const fromSelection = normalizeId(selectedAppointmentId)
    if (fromSelection) return fromSelection

    return normalizeId(routeAppointmentId)
  }, [routeAppointmentId, selectedAppointment?.id, selectedAppointmentId])

  const selectedSession = selectedAppointmentKey ? sessionsByAppointmentId[selectedAppointmentKey] || null : null
  const selectedReadiness = selectedSession ? readinessBySessionId[selectedSession.id] || null : null
  const selectedConsultation = selectedSession ? consultationsBySessionId[selectedSession.id] || null : null
  const selectedPrescriptions = selectedConsultation ? prescriptionsByConsultationId[selectedConsultation.id] || [] : []
  const selectedSessionId = selectedSession?.id || null
  const selectedSessionAppointmentId = selectedSession?.appointmentId || selectedAppointmentKey || null
  const selectedSessionStatus = selectedSession?.sessionStatus || null
  const appointmentIdForSessionCreation = useMemo(() => {
    const routeId = normalizeId(routeAppointmentId)
    if (routeId) return routeId

    const selectedId = normalizeId(selectedAppointment?.id || selectedAppointmentId)
    return selectedId
  }, [routeAppointmentId, selectedAppointment?.id, selectedAppointmentId])

  useEffect(() => {
    selectedAppointmentIdRef.current = selectedAppointmentId
  }, [selectedAppointmentId])

  useEffect(() => {
    setSelectedAppointmentId(routeAppointmentId || null)
  }, [routeAppointmentId])

  const refreshAppointments = useCallback(async ({ preferredAppointmentId = null, preserveSelection = true } = {}) => {
    if (!doctorId) {
      startTransition(() => {
        setAppointments([])
        setSelectedAppointmentId(null)
      })
      setAppointmentsLoading(false)
      setAppointmentsError('Logged-in doctor id was not found in local storage. Please sign in again.')
      return
    }

    setAppointmentsLoading(true)
    setAppointmentsError('')

    try {
      const nextAppointments = await listAppointments({ doctorId })

      startTransition(() => {
        setAppointments(nextAppointments)

        let nextSelectedAppointmentId = null

        if (preferredAppointmentId && nextAppointments.some((appointment) => appointment.id === preferredAppointmentId)) {
          nextSelectedAppointmentId = preferredAppointmentId
        } else if (
          preserveSelection &&
          selectedAppointmentIdRef.current &&
          nextAppointments.some((appointment) => appointment.id === selectedAppointmentIdRef.current)
        ) {
          nextSelectedAppointmentId = selectedAppointmentIdRef.current
        } else {
          nextSelectedAppointmentId = null
        }

        setSelectedAppointmentId(nextSelectedAppointmentId)
      })
    } catch (error) {
      setAppointmentsError(getErrorMessage(error, 'Unable to load telemedicine appointments.'))
    } finally {
      setAppointmentsLoading(false)
    }
  }, [doctorId])

  const refreshSessionForAppointment = useCallback(async (appointmentId, { showLoading = true } = {}) => {
    if (!appointmentId) return undefined

    if (showLoading) setSessionLookupLoading(true)
    setSessionError('')

    try {
      const sessions = await listSessions()
      const nextSessionMap = sessions.reduce((map, session) => {
        const key = normalizeId(session?.appointmentId)
        if (!key) return map

        const current = map[key]
        if (!current) {
          map[key] = session
          return map
        }

        const currentCreatedAt = new Date(current?.createdAt || 0).getTime()
        const candidateCreatedAt = new Date(session?.createdAt || 0).getTime()
        if (candidateCreatedAt >= currentCreatedAt) {
          map[key] = session
        }
        return map
      }, {})

      startTransition(() => {
        setSessionsByAppointmentId((current) => ({
          ...current,
          ...nextSessionMap,
          [appointmentId]: nextSessionMap[appointmentId] || null,
        }))
      })

      return nextSessionMap[appointmentId] || null
    } catch (error) {
      setSessionError(getErrorMessage(error, 'Unable to load session details for this appointment.'))
      return undefined
    } finally {
      if (showLoading) setSessionLookupLoading(false)
    }
  }, [])

  const refreshReadinessForSession = useCallback(async (session) => {
    if (!session?.id) return null

    try {
      const readiness = await getSessionReady(session.id)
      startTransition(() => {
        setReadinessBySessionId((current) => {
          const currentReadiness = current[session.id]
          if (
            currentReadiness &&
            currentReadiness.doctorJoined === readiness.doctorJoined &&
            currentReadiness.patientJoined === readiness.patientJoined &&
            currentReadiness.ready === readiness.ready &&
            currentReadiness.sessionStatus === readiness.sessionStatus
          ) {
            return current
          }

          return {
            ...current,
            [session.id]: readiness,
          }
        })

        setSessionsByAppointmentId((current) => {
          const currentSession = current[session.appointmentId]
          if (!currentSession || currentSession.sessionStatus === readiness.sessionStatus) {
            return current
          }

          return {
            ...current,
            [session.appointmentId]: {
              ...currentSession,
              sessionStatus: readiness.sessionStatus,
            },
          }
        })
      })
      return readiness
    } catch (error) {
      setSessionError(getErrorMessage(error, 'Unable to refresh readiness for the current session.'))
      return null
    }
  }, [])

  useEffect(() => {
    if (!autoStartRequested) return

    const appointmentId = normalizeId(routeAppointmentId)
    if (!appointmentId) return

    if (autoStartTriggeredRef.current) return
    autoStartTriggeredRef.current = true

    let cancelled = false

    async function autoStart() {
      setSessionActionState(actionLoading('autostart'))

      try {
        const existingSession = await refreshSessionForAppointment(appointmentId, { showLoading: false })
        let session = existingSession

        if (!session) {
          session = await createSession(appointmentId)
          startTransition(() => {
            setSessionsByAppointmentId((current) => ({
              ...current,
              [appointmentId]: session,
            }))
          })
        }

        const status = String(session?.sessionStatus || '').toUpperCase()
        if (['COMPLETED', 'MISSED', 'CANCELLED'].includes(status)) {
          throw new Error('This consultation session cannot be started.')
        }

        const joinInfo = await getJoinToken(session.id, 'doctor', true)
        if (!cancelled) {
          setDoctorJoinInfo(joinInfo)
        }

        const liveSession = status === 'LIVE' ? session : await startSession(session.id)
        if (!cancelled) {
          startTransition(() => {
            setSessionsByAppointmentId((current) => ({
              ...current,
              [appointmentId]: liveSession,
            }))
          })
        }

        await refreshReadinessForSession(liveSession)

        if (!cancelled) {
          if (!popupMode) {
            setConsultationModalOpen(true)
          }
          setSessionActionState(actionSuccess('autostart', 'Consultation started.'))
          navigate(`/doctor/telemedicine/${appointmentId}${popupMode ? '?popup=1' : ''}`, { replace: true })
        }
      } catch (error) {
        if (cancelled) return
        setSessionActionState(actionError('autostart', getErrorMessage(error, 'Unable to start the consultation.')))
      }
    }

    autoStart()
    return () => {
      cancelled = true
    }
  }, [
    autoStartRequested,
    navigate,
    popupMode,
    refreshReadinessForSession,
    refreshSessionForAppointment,
    routeAppointmentId,
  ])

  useEffect(() => {
    if (!popupMode) return
    if (!selectedSession?.id) return
    if (doctorJoinInfo && doctorJoinInfo.sessionId === selectedSession.id) return

    let cancelled = false

    async function ensureJoinAccess() {
      try {
        const joinInfo = await getJoinToken(selectedSession.id, 'doctor', true)
        if (!cancelled) {
          setDoctorJoinInfo(joinInfo)
        }
      } catch {
        // Surface errors via existing action panels/state; popup mode will still show session status.
      }
    }

    ensureJoinAccess()
    return () => {
      cancelled = true
    }
  }, [doctorJoinInfo, popupMode, selectedSession?.id])

  const refreshConsultationForSession = useCallback(async (session) => {
    if (!session?.id) return null

    try {
      const consultations = await listConsultations()
      const matchingConsultation = consultations.find((consultation) => consultation.sessionId === session.id) || null

      startTransition(() => {
        setConsultationsBySessionId((current) => ({
          ...current,
          [session.id]: matchingConsultation,
        }))
      })

      return matchingConsultation
    } catch (error) {
      setConsultationActionState(actionError('fetch', getErrorMessage(error, 'Unable to load consultation record.')))
      return null
    }
  }, [])

  const refreshPrescriptionsForConsultation = useCallback(async (consultationId) => {
    if (!consultationId) return []

    try {
      const prescriptions = await listPrescriptions({ consultationId })
      startTransition(() => {
        setPrescriptionsByConsultationId((current) => ({
          ...current,
          [consultationId]: prescriptions,
        }))
      })
      return prescriptions
    } catch (error) {
      setPrescriptionActionState(actionError('fetch', getErrorMessage(error, 'Unable to load prescriptions.')))
      return []
    }
  }, [])

  useEffect(() => {
    refreshAppointments({ preserveSelection: Boolean(routeAppointmentId) })
  }, [refreshAppointments, routeAppointmentId])

  useEffect(() => {
    const appointmentKey = normalizeId(selectedAppointment?.id || selectedAppointmentId || routeAppointmentId)
    if (!appointmentKey) {
      setSessionError('')
      return
    }

    refreshSessionForAppointment(appointmentKey)
  }, [refreshSessionForAppointment, routeAppointmentId, selectedAppointment?.id, selectedAppointmentId])

  useEffect(() => {
    if (!selectedSessionId || !READY_POLL_STATUSES.has(selectedSessionStatus)) {
      return undefined
    }

    const pollingSession = {
      id: selectedSessionId,
      appointmentId: selectedSessionAppointmentId,
    }

    refreshReadinessForSession(pollingSession)

    const intervalId = window.setInterval(() => {
      refreshReadinessForSession(pollingSession)
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [
    refreshReadinessForSession,
    selectedSessionAppointmentId,
    selectedSessionId,
    selectedSessionStatus,
  ])

  useEffect(() => {
    if (!selectedSession?.id || selectedSession.sessionStatus !== 'COMPLETED') {
      return
    }

    refreshConsultationForSession(selectedSession)
  }, [refreshConsultationForSession, selectedSession])

  useEffect(() => {
    if (!selectedConsultation?.id) {
      return
    }

    refreshPrescriptionsForConsultation(selectedConsultation.id)
  }, [refreshPrescriptionsForConsultation, selectedConsultation?.id])

  useEffect(() => {
    if (!selectedSession) {
      setDoctorJoinInfo(null)
      return
    }

    if (doctorJoinInfo && doctorJoinInfo.sessionId !== selectedSession.id) {
      setDoctorJoinInfo(null)
    }
  }, [doctorJoinInfo, selectedSession])

  useEffect(() => {
    if (!selectedSession) {
      setConsultationModalOpen(false)
    }
  }, [selectedSession])

  useEffect(() => {
    if (!consultationModalOpen) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [consultationModalOpen])

  const handleAcceptAppointment = async (appointmentId) => {
    setAppointmentActionState(actionLoading('accept'))

    try {
      await acceptAppointment(appointmentId)
      await refreshAppointments({ preferredAppointmentId: appointmentId })
      setAppointmentActionState(actionSuccess('accept', 'Appointment accepted. You can create the session now.'))
    } catch (error) {
      setAppointmentActionState(actionError('accept', getErrorMessage(error, 'Unable to accept the appointment.')))
    }
  }

  const handleRejectAppointment = async (appointmentId, reason) => {
    setAppointmentActionState(actionLoading('reject'))

    try {
      await rejectAppointment(appointmentId, reason)
      await refreshAppointments({ preferredAppointmentId: appointmentId })
      await refreshSessionForAppointment(appointmentId, { showLoading: false })
      setDoctorJoinInfo(null)
      setAppointmentActionState(actionSuccess('reject', 'Appointment rejected and session state refreshed.'))
    } catch (error) {
      setAppointmentActionState(actionError('reject', getErrorMessage(error, 'Unable to reject the appointment.')))
    }
  }

  const handleRescheduleAppointment = async (appointmentId, payload) => {
    setAppointmentActionState(actionLoading('reschedule'))

    try {
      await rescheduleAppointment(appointmentId, {
        newScheduledAt: toIsoStringFromLocalValue(payload.newScheduledAt),
        reason: payload.reason,
      })
      await refreshAppointments({ preferredAppointmentId: appointmentId })
      await refreshSessionForAppointment(appointmentId, { showLoading: false })
      setDoctorJoinInfo(null)
      setAppointmentActionState(actionSuccess('reschedule', 'Appointment rescheduled and linked session refreshed.'))
    } catch (error) {
      setAppointmentActionState(actionError('reschedule', getErrorMessage(error, 'Unable to reschedule the appointment.')))
    }
  }

  const handleCreateSession = async () => {
    if (!appointmentIdForSessionCreation) {
      setSessionActionState(actionError('create', 'Appointment id is missing. Open a valid appointment and try again.'))
      return
    }

    setSessionActionState(actionLoading('create'))

    try {
      const createdSession = await createSession(appointmentIdForSessionCreation)
      startTransition(() => {
        setSessionsByAppointmentId((current) => ({
          ...current,
          [appointmentIdForSessionCreation]: createdSession,
        }))
      })
      await refreshSessionForAppointment(appointmentIdForSessionCreation, { showLoading: false })
      setSessionActionState(actionSuccess('create', 'Session created. Generate doctor join access to open the room.'))
    } catch (error) {
      setSessionActionState(actionError('create', getErrorMessage(error, 'Unable to create the session.')))
    }
  }

  const handleRefreshSelectedSession = async () => {
    const appointmentKey = normalizeId(selectedSessionAppointmentId)
    if (!appointmentKey) return

    setSessionActionState(actionLoading('refresh'))

    const refreshedSession = await refreshSessionForAppointment(appointmentKey)
    if (refreshedSession !== undefined) {
      setSessionActionState(actionSuccess('refresh', 'Session details refreshed.'))
    } else {
      setSessionActionState(actionError('refresh', 'Unable to refresh the current session.'))
    }
  }

  const handleCheckReadiness = async () => {
    if (!selectedSession) return

    setSessionActionState(actionLoading('readiness'))

    const readiness = await refreshReadinessForSession(selectedSession)
    if (readiness) {
      setSessionActionState(actionSuccess('readiness', 'Readiness refreshed from the backend.'))
    }
  }

  const handleGenerateDoctorJoin = async () => {
    if (!selectedSession) return

    const appointmentKey = normalizeId(selectedSession.appointmentId || selectedSessionAppointmentId)
    if (!appointmentKey) return

    setSessionActionState(actionLoading('join'))

    try {
      const joinInfo = await getJoinToken(selectedSession.id, 'doctor', true)
      setDoctorJoinInfo(joinInfo)
      await refreshSessionForAppointment(appointmentKey, { showLoading: false })
      await refreshReadinessForSession(selectedSession)
      setSessionActionState(
        actionSuccess(
          'join',
          joinInfo.publicRoom
            ? 'Doctor join access prepared for a public Jitsi room. The live meeting panel is ready.'
            : 'Doctor join token generated. The live meeting panel is ready.'
        )
      )
    } catch (error) {
      setSessionActionState(actionError('join', getErrorMessage(error, 'Unable to generate doctor join access.')))
    }
  }

  const handleStartSession = async () => {
    if (!selectedSession) return

    const appointmentKey = normalizeId(selectedSession.appointmentId || selectedSessionAppointmentId)
    if (!appointmentKey) return

    setSessionActionState(actionLoading('start'))

    try {
      const updatedSession = await startSession(selectedSession.id)
      let joinInfo = doctorJoinInfo

      if (!joinInfo || joinInfo.sessionId !== updatedSession.id) {
        joinInfo = await getJoinToken(updatedSession.id, 'doctor', true)
      }

      startTransition(() => {
        setSessionsByAppointmentId((current) => ({
          ...current,
          [appointmentKey]: updatedSession,
        }))
        if (joinInfo) {
          setDoctorJoinInfo(joinInfo)
        }
      })
      await refreshReadinessForSession(updatedSession)
      if (!popupMode) {
        const appointmentKeyForUrl = normalizeId(updatedSession.appointmentId || appointmentKey)
        if (appointmentKeyForUrl) {
          window.open(`/doctor/telemedicine/${appointmentKeyForUrl}?autostart=1&popup=1`, '_blank')
        }
        setSessionActionState(actionSuccess('start', 'Session marked as live. Opening the video call in a new window...'))
        return
      }

      setConsultationModalOpen(true)
      setSessionActionState(actionSuccess('start', 'Session marked as live. Consultation workspace opened.'))
    } catch (error) {
      setSessionActionState(actionError('start', getErrorMessage(error, 'Unable to start the session.')))
    }
  }

  const handleEndSession = async () => {
    if (!selectedSession) return

    const appointmentKey = normalizeId(selectedSession.appointmentId || selectedSessionAppointmentId)
    if (!appointmentKey) return

    setSessionActionState(actionLoading('end'))

    try {
      const updatedSession = await endSession(selectedSession.id)
      startTransition(() => {
        setSessionsByAppointmentId((current) => ({
          ...current,
          [appointmentKey]: updatedSession,
        }))
      })
      await refreshConsultationForSession(updatedSession)
      setSessionActionState(
        actionSuccess(
          'end',
          'Telemedicine completed. Appointment marked completed and notifications queued for patient and doctor.'
        )
      )
    } catch (error) {
      setSessionActionState(actionError('end', getErrorMessage(error, 'Unable to complete telemedicine.')))
    }
  }

  const handleCreateConsultation = async (payload) => {
    setConsultationActionState(actionLoading('create'))

    try {
      const createdConsultation = await createConsultation({
        ...payload,
        followUpDate: payload.followUpDate || null,
      })
      startTransition(() => {
        setConsultationsBySessionId((current) => ({
          ...current,
          [createdConsultation.sessionId]: createdConsultation,
        }))
      })
      setConsultationActionState(actionSuccess('create', 'Consultation record created. You can issue prescriptions now.'))
    } catch (error) {
      setConsultationActionState(actionError('create', getErrorMessage(error, 'Unable to create the consultation record.')))
    }
  }

  const handleUpdateConsultation = async (consultationId, payload) => {
    setConsultationActionState(actionLoading('update'))

    try {
      const updatedConsultation = await updateConsultation(consultationId, {
        ...payload,
        followUpDate: payload.followUpDate || null,
      })
      startTransition(() => {
        setConsultationsBySessionId((current) => ({
          ...current,
          [updatedConsultation.sessionId]: updatedConsultation,
        }))
      })
      setConsultationActionState(actionSuccess('update', 'Consultation record updated.'))
    } catch (error) {
      setConsultationActionState(actionError('update', getErrorMessage(error, 'Unable to update the consultation record.')))
    }
  }

  const handleCreatePrescription = async (payload) => {
    setPrescriptionActionState(actionLoading('create'))

    try {
      const createdPrescription = await createPrescription({
        ...payload,
        expiresAt: toIsoStringFromLocalValue(payload.expiresAt),
        medications: payload.medications.map((medication) => ({
          ...medication,
          durationDays: Number(medication.durationDays),
        })),
      })

      await refreshPrescriptionsForConsultation(createdPrescription.consultationId)
      setPrescriptionActionState(actionSuccess('create', 'Prescription issued successfully.'))
    } catch (error) {
      setPrescriptionActionState(actionError('create', getErrorMessage(error, 'Unable to create the prescription.')))
    }
  }

  const handleUpdatePrescriptionStatus = async (prescriptionId, status) => {
    if (!selectedConsultation?.id) return

    setPrescriptionActionState(actionLoading('status'))

    try {
      await updatePrescriptionStatus(prescriptionId, status)
      await refreshPrescriptionsForConsultation(selectedConsultation.id)
      setPrescriptionActionState(actionSuccess('status', `Prescription marked as ${status}.`))
    } catch (error) {
      setPrescriptionActionState(actionError('status', getErrorMessage(error, 'Unable to update prescription status.')))
    }
  }

  const handleCancelPrescription = async (prescriptionId) => {
    if (!selectedConsultation?.id) return

    setPrescriptionActionState(actionLoading('cancel'))

    try {
      await cancelPrescription(prescriptionId)
      await refreshPrescriptionsForConsultation(selectedConsultation.id)
      setPrescriptionActionState(actionSuccess('cancel', 'Prescription cancelled successfully.'))
    } catch (error) {
      setPrescriptionActionState(actionError('cancel', getErrorMessage(error, 'Unable to cancel the prescription.')))
    }
  }

  const handleSelectAppointment = useCallback((appointmentId) => {
    navigate(`/doctor/telemedicine/${appointmentId}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [navigate])

  if (popupMode) {
    return (
      <div className="flex h-screen min-h-0 flex-col bg-[hsl(var(--background))]">
        <div
          className="flex items-center justify-between border-b px-4 py-3 lg:px-6"
          style={{ borderColor: 'hsl(var(--border))' }}
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Doctor video consultation
            </p>
            <p className="mt-1 truncate text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              {selectedSession?.jitsiRoomId || selectedSession?.id || normalizeId(routeAppointmentId) || 'Consultation'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedSession?.sessionStatus ? <StatusBadge status={selectedSession.sessionStatus} /> : null}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition hover:bg-black/4 dark:hover:bg-white/6"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {sessionActionState.error ? (
          <div className="p-4">
            <FeatureNotice tone="error" title="Unable to start consultation" message={sessionActionState.error} />
          </div>
        ) : null}

        {!selectedSession ? (
          <div className="p-4">
            <FeatureNotice
              tone="info"
              title="Loading session"
              message="Fetching the telemedicine session for this appointment..."
            />
          </div>
        ) : null}

        {selectedSession && selectedSession.sessionStatus !== 'LIVE' ? (
          <div className="p-4">
            <FeatureNotice
              tone="warning"
              title="Session not live"
              message="This session is not marked LIVE yet. Use the main telemedicine workspace to start it, or open this window with autostart enabled."
            />
          </div>
        ) : null}

        <div className="flex-1 min-h-0">
          <LiveConsultationPanel currentUser={user} session={selectedSession} joinInfo={doctorJoinInfo} fullscreen />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">


      {!selectedAppointment ? (
        <>
          <AppointmentInbox
            appointments={deferredAppointments}
            sessionsByAppointmentId={sessionsByAppointmentId}
            loading={appointmentsLoading}
            error={appointmentsError}
            onRefreshAppointments={() => refreshAppointments({ preserveSelection: true })}
            onSelectAppointment={handleSelectAppointment}
          />


        </>
      ) : (
        <div className="space-y-5">
          {/* ── Workspace hero header with progress stepper ── */}
          <ConsultationWorkspaceHeader
            appointment={selectedAppointment}
            session={selectedSession}
            consultation={selectedConsultation}
            onBack={() => navigate('/doctor/telemedicine')}
          />

          {/* ── Appointment decision panel ── */}
          <TelemedicineSection
            title="Appointment Details"
            description="Review patient info, then accept, reject, or propose a new time for the appointment."
          >
            <div className="space-y-5">
              {appointmentActionState.error ? (
                <FeatureNotice tone="error" title="Appointment action failed" message={appointmentActionState.error} />
              ) : null}
              {appointmentActionState.success ? (
                <FeatureNotice tone="success" title="Appointment updated" message={appointmentActionState.success} />
              ) : null}

              <AppointmentDetailsPanel
                selectedAppointment={selectedAppointment}
                doctorDisplay={doctorDisplay}
                actionState={appointmentActionState}
                onAcceptAppointment={handleAcceptAppointment}
                onRejectAppointment={handleRejectAppointment}
                onRescheduleAppointment={handleRescheduleAppointment}
              />
            </div>
          </TelemedicineSection>

          <div className="grid gap-5">
            <SessionControlPanel
              appointment={selectedAppointment}
              session={selectedSession}
              readiness={selectedReadiness}
              joinInfo={doctorJoinInfo}
              loading={sessionLookupLoading}
              error={sessionError}
              actionState={sessionActionState}
              onRefreshSession={handleRefreshSelectedSession}
              onCreateSession={handleCreateSession}
              onCheckReadiness={handleCheckReadiness}
              onGenerateDoctorJoin={handleGenerateDoctorJoin}
              onStartSession={handleStartSession}
              onEndSession={handleEndSession}
            />
          </div>

          {!consultationModalOpen ? (
            <ClinicalWrapUpPanel
              session={selectedSession}
              consultation={selectedConsultation}
              prescriptions={selectedPrescriptions}
              consultationActionState={consultationActionState}
              prescriptionActionState={prescriptionActionState}
              onCreateConsultation={handleCreateConsultation}
              onUpdateConsultation={handleUpdateConsultation}
              onCreatePrescription={handleCreatePrescription}
              onUpdatePrescriptionStatus={handleUpdatePrescriptionStatus}
              onCancelPrescription={handleCancelPrescription}
            />
          ) : null}
        </div>
      )}

      {consultationModalOpen && selectedSession ? (
        <div className="fixed inset-0 z-[9999] bg-black/55">
          <div
            className="h-screen w-screen bg-[hsl(var(--background))]"
            role="dialog"
            aria-modal="true"
            aria-label="Live consultation workspace"
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3 lg:px-6"
              style={{ borderColor: 'hsl(var(--border))' }}
            >
              <div>
                <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {selectedSession.sessionStatus === 'COMPLETED' ? 'Session completed' : 'Consultation in progress'}
                </p>
                <p className="mt-1 text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                  {selectedSession.jitsiRoomId || selectedSession.id}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selectedSession.sessionStatus} />
                <button
                  type="button"
                  onClick={handleGenerateDoctorJoin}
                  disabled={sessionActionState.loading}
                  className="inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition hover:bg-black/4 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/6"
                  style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                >
                  Refresh Join Access
                </button>
                {selectedSession.sessionStatus === 'LIVE' ? (
                  <button
                    type="button"
                    onClick={handleEndSession}
                    disabled={sessionActionState.loading}
                    className="inline-flex items-center justify-center rounded-2xl border border-rose-300 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-900 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-800/70 dark:bg-rose-950/35 dark:text-rose-100 dark:hover:bg-rose-900/45"
                  >
                    {sessionActionState.loading && sessionActionState.kind === 'end' ? 'Completing...' : 'Complete Telemedicine'}
                  </button>
                ) : null}
                {selectedSession.sessionStatus === 'COMPLETED' ? (
                  <button
                    type="button"
                    onClick={() => setConsultationModalOpen(false)}
                    className="inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition hover:bg-black/4 dark:hover:bg-white/6"
                    style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                  >
                    Close
                  </button>
                ) : null}
              </div>
            </div>

            {selectedSession.sessionStatus === 'LIVE' ? (
              <div className="h-[calc(100vh-4.5rem)] min-h-0 p-3 lg:p-4">
                <div className="h-full min-h-0 overflow-hidden rounded-[20px] border" style={{ borderColor: 'hsl(var(--border))' }}>
                  <LiveConsultationPanel
                    currentUser={user}
                    session={selectedSession}
                    joinInfo={doctorJoinInfo}
                    fullscreen
                  />
                </div>
              </div>
            ) : (
              <div className="h-[calc(100vh-4.5rem)] min-h-0 p-3 lg:p-4">
                <div className="h-full min-h-0 overflow-y-auto rounded-[20px] border p-2" style={{ borderColor: 'hsl(var(--border))' }}>
                  <ClinicalWrapUpPanel
                    session={selectedSession}
                    consultation={selectedConsultation}
                    prescriptions={selectedPrescriptions}
                    consultationActionState={consultationActionState}
                    prescriptionActionState={prescriptionActionState}
                    onCreateConsultation={handleCreateConsultation}
                    onUpdateConsultation={handleUpdateConsultation}
                    onCreatePrescription={handleCreatePrescription}
                    onUpdatePrescriptionStatus={handleUpdatePrescriptionStatus}
                    onCancelPrescription={handleCancelPrescription}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

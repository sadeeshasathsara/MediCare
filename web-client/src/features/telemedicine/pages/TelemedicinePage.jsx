import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { CalendarClock, HeartPulse, RefreshCcw, Stethoscope } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import AppointmentDetailsPanel from '@/features/telemedicine/components/AppointmentDetailsPanel'
import AppointmentInbox from '@/features/telemedicine/components/AppointmentInbox'
import ClinicalWrapUpPanel from '@/features/telemedicine/components/ClinicalWrapUpPanel'
import FeatureNotice from '@/features/telemedicine/components/FeatureNotice'
import LiveConsultationPanel from '@/features/telemedicine/components/LiveConsultationPanel'
import ManualTestToolsPanel from '@/features/telemedicine/components/ManualTestToolsPanel'
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
  syncAppointment,
  updateConsultation,
  updatePrescriptionStatus,
} from '@/features/telemedicine/services/telemedicineApi'
import {
  buildJitsiRoomUrl,
  createDemoAppointmentPayload,
  enrichTelemedicineAppointment,
  formatDateTime,
  getErrorMessage,
  getSessionStateCopy,
  READY_POLL_STATUSES,
  resolveTelemedicineDoctor,
  SEEDED_TELEMEDICINE_PATIENT,
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

  const { user, accessToken } = useAuth()
  const doctorId = user?.id || decodeJwtSubject(accessToken) || user?.email || 'doctor-demo'
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
  const [manualToolsActionState, setManualToolsActionState] = useState(EMPTY_ACTION_STATE)

  const enrichedAppointments = useMemo(
    () => appointments.map((appointment) => enrichTelemedicineAppointment(appointment, user, doctorId)),
    [appointments, doctorId, user]
  )
  const deferredAppointments = useDeferredValue(enrichedAppointments)
  const selectedAppointment = enrichedAppointments.find((appointment) => appointment.id === selectedAppointmentId) || null
  const selectedSession = selectedAppointment ? sessionsByAppointmentId[selectedAppointment.id] || null : null
  const selectedReadiness = selectedSession ? readinessBySessionId[selectedSession.id] || null : null
  const selectedConsultation = selectedSession ? consultationsBySessionId[selectedSession.id] || null : null
  const selectedPrescriptions = selectedConsultation ? prescriptionsByConsultationId[selectedConsultation.id] || [] : []
  const selectedSessionId = selectedSession?.id || null
  const selectedSessionAppointmentId = selectedSession?.appointmentId || null
  const selectedSessionStatus = selectedSession?.sessionStatus || null
  const workspaceSummary = selectedSession
    ? getSessionStateCopy(selectedSession.sessionStatus)
    : selectedAppointment
      ? 'Appointment selected. Review it, then create or manage the session from the next section.'
      : 'No appointment selected yet. Use the inbox or demo tools to begin.'

  useEffect(() => {
    selectedAppointmentIdRef.current = selectedAppointmentId
  }, [selectedAppointmentId])

  useEffect(() => {
    setSelectedAppointmentId(routeAppointmentId || null)
  }, [routeAppointmentId])

  const refreshAppointments = useCallback(async ({ preferredAppointmentId = null, preserveSelection = true } = {}) => {
    setAppointmentsLoading(true)
    setAppointmentsError('')

    try {
      const nextAppointments = await listAppointments()

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
  }, [])

  const refreshSessionForAppointment = useCallback(async (appointmentId, { showLoading = true } = {}) => {
    if (!appointmentId) return undefined

    if (showLoading) setSessionLookupLoading(true)
    setSessionError('')

    try {
      const sessions = await listSessions()
      const nextSessionMap = sessions.reduce((map, session) => {
        map[session.appointmentId] = session
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
    if (!selectedAppointment?.id) {
      setSessionError('')
      return
    }

    refreshSessionForAppointment(selectedAppointment.id)
  }, [refreshSessionForAppointment, selectedAppointment?.id])

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
    if (!selectedAppointment?.id) return

    setSessionActionState(actionLoading('create'))

    try {
      const createdSession = await createSession(selectedAppointment.id)
      startTransition(() => {
        setSessionsByAppointmentId((current) => ({
          ...current,
          [selectedAppointment.id]: createdSession,
        }))
      })
      setSessionActionState(actionSuccess('create', 'Session created. Generate doctor join access to open the room.'))
    } catch (error) {
      setSessionActionState(actionError('create', getErrorMessage(error, 'Unable to create the session.')))
    }
  }

  const handleRefreshSelectedSession = async () => {
    if (!selectedAppointment?.id) return

    setSessionActionState(actionLoading('refresh'))

    const refreshedSession = await refreshSessionForAppointment(selectedAppointment.id)
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
    if (!selectedSession || !selectedAppointment) return

    setSessionActionState(actionLoading('join'))

    try {
      const joinInfo = await getJoinToken(selectedSession.id, 'doctor', true)
      setDoctorJoinInfo(joinInfo)
      await refreshSessionForAppointment(selectedAppointment.id, { showLoading: false })
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
    if (!selectedSession || !selectedAppointment) return

    setSessionActionState(actionLoading('start'))

    try {
      const updatedSession = await startSession(selectedSession.id)
      startTransition(() => {
        setSessionsByAppointmentId((current) => ({
          ...current,
          [selectedAppointment.id]: updatedSession,
        }))
      })
      setSessionActionState(actionSuccess('start', 'Session marked as live.'))
    } catch (error) {
      setSessionActionState(actionError('start', getErrorMessage(error, 'Unable to start the session.')))
    }
  }

  const handleEndSession = async () => {
    if (!selectedSession || !selectedAppointment) return

    setSessionActionState(actionLoading('end'))

    try {
      const updatedSession = await endSession(selectedSession.id)
      startTransition(() => {
        setSessionsByAppointmentId((current) => ({
          ...current,
          [selectedAppointment.id]: updatedSession,
        }))
      })
      await refreshConsultationForSession(updatedSession)
      setSessionActionState(actionSuccess('end', 'Session completed. Consultation notes are now unlocked.'))
    } catch (error) {
      setSessionActionState(actionError('end', getErrorMessage(error, 'Unable to end the session.')))
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

  const createManualDemoAppointment = async (payload, successMessage, kind) => {
    setManualToolsActionState(actionLoading(kind))

    try {
      const createdAppointment = await syncAppointment(
        createDemoAppointmentPayload({
          doctorId,
          patientId: SEEDED_TELEMEDICINE_PATIENT.userId,
          scheduledAt: toIsoStringFromLocalValue(payload.scheduledAt),
          reasonForVisit: payload.reasonForVisit,
          notes: payload.notes,
        })
      )

      await refreshAppointments({ preferredAppointmentId: createdAppointment.id, preserveSelection: false })
      setManualToolsActionState(actionSuccess(kind, successMessage))
    } catch (error) {
      setManualToolsActionState(actionError(kind, getErrorMessage(error, 'Unable to seed the demo appointment.')))
    }
  }

  const handleSeedDemoAppointment = async (payload) => {
    await createManualDemoAppointment(payload, 'Demo appointment created and selected in the inbox.', 'seed')
  }

  const handleQuickDemo = async (payload) => {
    await createManualDemoAppointment(
      payload,
      'Quick demo appointment is ready. Accept it in the inbox and continue through the normal session flow.',
      'quick-demo'
    )
  }

  const handleOpenPatientTestWindow = async () => {
    if (!selectedSession || !selectedAppointment) return

    const popupWindow = window.open('', 'telemedicine-patient-test', 'width=1200,height=900')
    if (!popupWindow) {
      setManualToolsActionState(actionError('patient-window', 'Popup blocked. Allow popups for this site and try again.'))
      return
    }

    popupWindow.document.title = 'Opening patient test window...'
    popupWindow.document.body.innerHTML = '<p style="font-family:sans-serif;padding:24px;">Preparing patient test window...</p>'

    setManualToolsActionState(actionLoading('patient-window'))

    try {
      const joinInfo = await getJoinToken(selectedSession.id, 'patient', true)
      const meetingUrl = buildJitsiRoomUrl(joinInfo.jitsiDomain, joinInfo.roomId, joinInfo.token)

      if (!meetingUrl) {
        throw new Error('The patient join URL could not be created.')
      }

      popupWindow.location.replace(meetingUrl)
      await refreshSessionForAppointment(selectedAppointment.id, { showLoading: false })
      await refreshReadinessForSession(selectedSession)
      setManualToolsActionState(
        actionSuccess(
          'patient-window',
          joinInfo.publicRoom
            ? 'Patient test window opened for the public Jitsi room.'
            : 'Patient test window opened with a fresh join token.'
        )
      )
    } catch (error) {
      popupWindow.close()
      setManualToolsActionState(actionError('patient-window', getErrorMessage(error, 'Unable to open the patient test window.')))
    }
  }

  const handleSelectAppointment = useCallback((appointmentId) => {
    navigate(`/doctor/telemedicine/${appointmentId}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [navigate])

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
          <TelemedicineSection
            title="Appointment Details Page"
            description="Review this appointment in full, then continue through session management, live consultation, and clinical wrap-up without losing focus."
            actions={(
              <button
                type="button"
                onClick={() => navigate('/doctor/telemedicine')}
                className="inline-flex items-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
              >
                Back to my appointments
              </button>
            )}
          >
            <div className="space-y-5">
              <div
                className="rounded-[28px] border p-5"
                style={{
                  borderColor: 'hsl(var(--border))',
                  background:
                    'linear-gradient(135deg, hsl(var(--primary) / 0.16), hsl(var(--accent) / 0.34))',
                }}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={selectedAppointment.status} />
                      {selectedSession ? <StatusBadge status={selectedSession.sessionStatus} /> : null}
                      {selectedConsultation ? <StatusBadge status="COMPLETED" /> : null}
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                        {selectedAppointment.patientDisplay?.name || `Patient ${selectedAppointment.patientId}`}
                      </h2>
                      <p className="text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {selectedAppointment.reasonForVisit || 'Consultation request'}
                      </p>
                    </div>
                    <p className="max-w-2xl text-sm leading-6" style={{ color: 'hsl(var(--foreground))' }}>
                      {workspaceSummary}
                    </p>
                  </div>

                  <div className="rounded-[24px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card) / 0.76)' }}>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Appointment ID
                    </p>
                    <p className="mt-2 break-all text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {selectedAppointment.id}
                    </p>
                    <p className="mt-2 break-all text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {selectedAppointment.patientDisplay?.userId || selectedAppointment.patientId}
                    </p>
                  </div>
                </div>
              </div>

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

          <TelemedicineSection
            title="Appointment Workspace"
            description="This workspace keeps the current appointment context visible while the doctor manages session readiness, enters the call, and completes clinical outcomes."
          >
            <div className="grid gap-4 xl:grid-cols-4">
              <div
                className="rounded-[24px] border px-5 py-4"
                style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
              >
                <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Patient
                </p>
                <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                  {selectedAppointment.patientDisplay?.name || `Patient ${selectedAppointment.patientId}`}
                </p>
                <p className="mt-2 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {selectedAppointment.patientDisplay?.email || 'No patient email available'}
                </p>
              </div>

              <div
                className="rounded-[24px] border px-5 py-4"
                style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
              >
                <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Scheduled time
                </p>
                <div className="mt-2 flex items-start gap-2">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
                  <p className="text-sm font-semibold leading-6" style={{ color: 'hsl(var(--foreground))' }}>
                    {formatDateTime(selectedAppointment.scheduledAt)}
                  </p>
                </div>
              </div>

              <div
                className="rounded-[24px] border px-5 py-4"
                style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
              >
                <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Session room
                </p>
                <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                  {selectedSession?.jitsiRoomId || 'Not created yet'}
                </p>
                <p className="mt-2 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {selectedSession ? 'Room created and linked to this appointment.' : 'Create the session once the appointment is accepted.'}
                </p>
              </div>

              <div
                className="rounded-[24px] border px-5 py-4"
                style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
              >
                <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Clinical wrap-up
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {selectedConsultation ? (
                    <StatusBadge status="COMPLETED" />
                  ) : (
                    <StatusBadge status={selectedSession?.sessionStatus || selectedAppointment.status} className="opacity-75" />
                  )}
                </div>
                <p className="mt-2 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {selectedConsultation
                    ? 'Consultation record exists and prescriptions can be managed.'
                    : 'Consultation notes unlock after the session is completed.'}
                </p>
              </div>
            </div>
          </TelemedicineSection>

          <div className="grid gap-5 2xl:grid-cols-[0.92fr_1.08fr]">
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

            <LiveConsultationPanel currentUser={user} session={selectedSession} joinInfo={doctorJoinInfo} />
          </div>

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
      )}

      <ManualTestToolsPanel
        doctorDisplay={doctorDisplay}
        seededPatient={SEEDED_TELEMEDICINE_PATIENT}
        selectedSession={selectedSession}
        actionState={manualToolsActionState}
        onSeedDemoAppointment={handleSeedDemoAppointment}
        onQuickDemo={handleQuickDemo}
        onOpenPatientTestWindow={handleOpenPatientTestWindow}
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => refreshAppointments({ preserveSelection: true })}
          className="inline-flex items-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
          style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh workspace
        </button>
      </div>

      <div
        className="rounded-[24px] border px-5 py-5"
        style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
      >
        <div className="flex items-start gap-3">
          <Stethoscope className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
          <div className="space-y-2">
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Manual validation checklist
            </p>
            <p className="text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Seed a demo appointment if needed, accept it, create a session, generate doctor join access, open the patient test window, then start and end the session. After completion, create the consultation and issue the prescription from this same page.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


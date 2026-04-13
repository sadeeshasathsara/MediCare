import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, HeartPulse, RefreshCcw, Video } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import FeatureNotice from '@/features/telemedicine/components/FeatureNotice'
import LiveConsultationPanel from '@/features/telemedicine/components/LiveConsultationPanel'
import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import TelemedicineSection from '@/features/telemedicine/components/TelemedicineSection'
import {
  getJoinToken,
  getSessionReady,
  listAppointments,
  listSessions,
} from '@/features/telemedicine/services/telemedicineApi'
import {
  enrichTelemedicineAppointment,
  formatDateTime,
  getErrorMessage,
  getSessionStateCopy,
  READY_POLL_STATUSES,
  resolveTelemedicinePatient,
} from '@/features/telemedicine/services/telemedicineTypes'

const SCHEDULED_APPOINTMENT_STATUSES = new Set(['PENDING', 'RESCHEDULED'])
const ACTIVE_PATIENT_STATUSES = new Set(['PENDING', 'ACCEPTED', 'RESCHEDULED'])
const EMPTY_ACTION_STATE = {
  kind: '',
  loading: false,
  error: '',
  success: '',
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

function actionButtonClass(kind = 'secondary') {
  if (kind === 'primary') {
    return 'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60'
  }

  return 'inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.05]'
}

function PatientAppointmentCard({ appointment, session, onSelect }) {
  const sessionLabel = session
    ? `Session ${session.sessionStatus.toLowerCase()}`
    : appointment.status === 'ACCEPTED'
      ? 'Waiting for doctor to open the room'
      : 'Pending doctor response'

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment.id)}
      className="w-full rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5"
      style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={appointment.status} />
              {session ? <StatusBadge status={session.sessionStatus} className="opacity-85" /> : null}
            </div>
            <p className="text-base font-semibold leading-6" style={{ color: 'hsl(var(--foreground))' }}>
              {appointment.reasonForVisit || 'Teleconsultation'}
            </p>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {appointment.doctorDisplay?.knownDoctor
                ? appointment.doctorDisplay.name
                : appointment.doctorId
                  ? `Doctor ID ${appointment.doctorId}`
                  : 'Doctor reference will appear here'}
            </p>
          </div>
          <div className="rounded-2xl px-3 py-2 text-right" style={{ backgroundColor: 'hsl(var(--background) / 0.7)' }}>
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Scheduled
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              {formatDateTime(appointment.scheduledAt)}
            </p>
          </div>
        </div>

        <div className="rounded-[20px] px-3 py-3 text-sm" style={{ backgroundColor: 'hsl(var(--background) / 0.65)', color: 'hsl(var(--muted-foreground))' }}>
          {sessionLabel}
        </div>

        <div className="flex justify-end">
          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
            Open appointment
          </span>
        </div>
      </div>
    </button>
  )
}

export default function PatientTelemedicinePage() {
  const { user } = useAuth()
  const patientId = user?.id || ''
  const selectedAppointmentIdRef = useRef(null)

  const [appointments, setAppointments] = useState([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [appointmentsError, setAppointmentsError] = useState('')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null)

  const [sessionsByAppointmentId, setSessionsByAppointmentId] = useState({})
  const [sessionLookupLoading, setSessionLookupLoading] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [readinessBySessionId, setReadinessBySessionId] = useState({})
  const [patientJoinInfo, setPatientJoinInfo] = useState(null)
  const [sessionActionState, setSessionActionState] = useState(EMPTY_ACTION_STATE)

  const patientDisplay = useMemo(() => {
    const resolved = resolveTelemedicinePatient(patientId)
    return {
      ...resolved,
      name: user?.name || resolved.name,
      email: user?.email || resolved.email,
    }
  }, [patientId, user?.email, user?.name])

  const enrichedAppointments = useMemo(
    () => appointments.map((appointment) => enrichTelemedicineAppointment(appointment, null, appointment.doctorId)),
    [appointments]
  )
  const deferredAppointments = useDeferredValue(enrichedAppointments)
  const scheduledAppointments = deferredAppointments.filter((appointment) => SCHEDULED_APPOINTMENT_STATUSES.has(appointment.status))
  const acceptedAppointments = deferredAppointments.filter((appointment) => appointment.status === 'ACCEPTED')
  const selectedAppointment = enrichedAppointments.find((appointment) => appointment.id === selectedAppointmentId) || null
  const selectedSession = selectedAppointment ? sessionsByAppointmentId[selectedAppointment.id] || null : null
  const selectedReadiness = selectedSession ? readinessBySessionId[selectedSession.id] || null : null
  const selectedSessionId = selectedSession?.id || null
  const selectedSessionAppointmentId = selectedSession?.appointmentId || null
  const selectedSessionStatus = selectedSession?.sessionStatus || null
  const activeAppointmentCount = scheduledAppointments.length + acceptedAppointments.length
  const joinableCount = acceptedAppointments.filter((appointment) => Boolean(sessionsByAppointmentId[appointment.id])).length

  useEffect(() => {
    selectedAppointmentIdRef.current = selectedAppointmentId
  }, [selectedAppointmentId])

  const refreshAppointments = useCallback(async ({ preferredAppointmentId = null, preserveSelection = true } = {}) => {
    setAppointmentsLoading(true)
    setAppointmentsError('')

    try {
      const nextAppointments = (await listAppointments()).filter((appointment) => {
        if (!ACTIVE_PATIENT_STATUSES.has(appointment.status)) return false
        if (!patientId) return true
        return appointment.patientId === patientId
      })

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
        }

        setSelectedAppointmentId(nextSelectedAppointmentId)
      })
    } catch (error) {
      setAppointmentsError(getErrorMessage(error, 'Unable to load your telemedicine appointments.'))
    } finally {
      setAppointmentsLoading(false)
    }
  }, [patientId])
  const refreshSessionsForAppointments = useCallback(async (appointmentList, { showLoading = true } = {}) => {
    if (showLoading) setSessionLookupLoading(true)
    setSessionError('')

    try {
      const appointmentIds = new Set((appointmentList || []).map((appointment) => appointment.id))
      if (appointmentIds.size === 0) {
        startTransition(() => setSessionsByAppointmentId({}))
        return
      }

      const sessions = await listSessions()
      const nextSessionMap = sessions.reduce((map, session) => {
        if (appointmentIds.has(session.appointmentId)) {
          map[session.appointmentId] = session
        }
        return map
      }, {})

      startTransition(() => {
        setSessionsByAppointmentId(nextSessionMap)
      })
    } catch (error) {
      setSessionError(getErrorMessage(error, 'Unable to load consultation session details.'))
    } finally {
      if (showLoading) setSessionLookupLoading(false)
    }
  }, [])

  const refreshReadinessForSession = useCallback(async (session) => {
    if (!session?.id) return null

    try {
      const readiness = await getSessionReady(session.id)
      startTransition(() => {
        setReadinessBySessionId((current) => ({
          ...current,
          [session.id]: readiness,
        }))

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
      setSessionError(getErrorMessage(error, 'Unable to refresh consultation readiness.'))
      return null
    }
  }, [])

  useEffect(() => {
    refreshAppointments({ preserveSelection: false })
  }, [refreshAppointments])

  useEffect(() => {
    refreshSessionsForAppointments(appointments, { showLoading: false })
  }, [appointments, refreshSessionsForAppointments])

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
  }, [refreshReadinessForSession, selectedSessionAppointmentId, selectedSessionId, selectedSessionStatus])

  useEffect(() => {
    if (!selectedSession) {
      setPatientJoinInfo(null)
      return
    }

    if (patientJoinInfo && patientJoinInfo.sessionId !== selectedSession.id) {
      setPatientJoinInfo(null)
    }
  }, [patientJoinInfo, selectedSession])

  const handleOpenAppointment = useCallback((appointmentId) => {
    setSelectedAppointmentId(appointmentId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleJoinConsultation = async () => {
    if (!selectedSession || !selectedAppointment) return

    setSessionActionState(actionLoading('join'))

    try {
      const joinInfo = await getJoinToken(selectedSession.id, 'patient', true)
      setPatientJoinInfo(joinInfo)
      await refreshSessionsForAppointments(enrichedAppointments, { showLoading: false })
      await refreshReadinessForSession(selectedSession)
      setSessionActionState(actionSuccess('join', 'Patient join access is ready. You can enter the consultation below.'))
    } catch (error) {
      setSessionActionState(actionError('join', getErrorMessage(error, 'Unable to prepare your consultation access.')))
    }
  }

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-[32px] border px-6 py-6 shadow-[0_30px_120px_-60px_rgba(6,182,212,0.35)] md:px-8 md:py-8"
        style={{
          borderColor: 'hsl(var(--border))',
          background:
            'radial-gradient(circle at top right, hsl(var(--accent)) 0%, transparent 34%), linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
        }}
      >
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--primary))' }}>
              <HeartPulse className="h-4 w-4" />
              {selectedAppointment ? 'Telemedicine Appointment' : 'Patient Telemedicine'}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: 'hsl(var(--foreground))' }}>
                {selectedAppointment ? selectedAppointment.reasonForVisit || 'Consultation details' : 'Your upcoming telemedicine visits'}
              </h1>
              <p className="max-w-2xl text-sm leading-7 md:text-base" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {selectedAppointment
                  ? `${selectedAppointment.patientDisplay?.name || patientDisplay.name}, review your appointment details, check session readiness, and join the consultation when your doctor is ready.`
                  : 'See your scheduled telemedicine visits, watch for accepted consultations, and join the Jitsi room when it is available.'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:w-[32rem]">
            <div className="rounded-[24px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card) / 0.88)' }}>
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Logged in as
              </p>
              <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                {patientDisplay.name}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {patientDisplay.email || patientDisplay.userId}
              </p>
            </div>

            <div className="rounded-[24px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card) / 0.88)' }}>
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Scheduled visits
              </p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                {scheduledAppointments.length}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Pending or rescheduled telemedicine visits waiting for doctor confirmation.
              </p>
            </div>

            <div className="rounded-[24px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card) / 0.88)' }}>
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Accepted consultations
              </p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                {acceptedAppointments.length}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Appointments that are confirmed and moving toward a live video consultation.
              </p>
            </div>

            <div className="rounded-[24px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card) / 0.88)' }}>
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Join-ready rooms
              </p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                {joinableCount}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Accepted consultations that already have a consultation room created.
              </p>
            </div>
          </div>
        </div>
      </section>

      {appointmentsError ? (
        <FeatureNotice tone="error" title="Unable to load appointments" message={appointmentsError} />
      ) : null}

      {sessionError ? (
        <FeatureNotice tone="warning" title="Session updates are limited" message={sessionError} />
      ) : null}

      {!selectedAppointment ? (
        <TelemedicineSection
          title="My Telemedicine Appointments"
          description="Open any scheduled or accepted appointment to review the details and join when the consultation room is ready."
          action={(
            <button
              type="button"
              onClick={() => refreshAppointments({ preserveSelection: false })}
              className={actionButtonClass()}
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${appointmentsLoading ? 'animate-spin' : ''}`} />
              Refresh appointments
            </button>
          )}
        >
          {appointmentsLoading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`patient-appointment-skeleton-${index}`}
                  className="h-40 animate-pulse rounded-[24px] border"
                  style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                />
              ))}
            </div>
          ) : activeAppointmentCount === 0 ? (
            <FeatureNotice
              tone="info"
              title="No telemedicine visits yet"
              message="Telemedicine appointments will appear here once your doctor or the appointment team schedules them for you."
            >
              <Link
                to="/patient/dashboard"
                className="mt-3 inline-flex items-center rounded-2xl border px-4 py-2 text-sm font-semibold transition hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
              >
                Back to dashboard
              </Link>
            </FeatureNotice>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-[26px] border p-5" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Scheduled for review
                      </p>
                      <h2 className="mt-2 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                        Pending and rescheduled visits
                      </h2>
                    </div>
                    <div className="rounded-2xl px-4 py-2 text-right" style={{ backgroundColor: 'hsl(var(--background) / 0.72)' }}>
                      <p className="text-2xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                        {scheduledAppointments.length}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    These appointments are still waiting for doctor confirmation or were moved to a new time for your review.
                  </p>
                </div>

                {scheduledAppointments.length > 0 ? (
                  scheduledAppointments.map((appointment) => (
                    <PatientAppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      session={sessionsByAppointmentId[appointment.id]}
                      onSelect={handleOpenAppointment}
                    />
                  ))
                ) : (
                  <FeatureNotice
                    tone="info"
                    title="No pending or rescheduled visits"
                    message="You do not have any telemedicine appointments waiting for confirmation right now."
                  />
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-[26px] border p-5" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Ready to consult
                      </p>
                      <h2 className="mt-2 text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                        Accepted telemedicine visits
                      </h2>
                    </div>
                    <div className="rounded-2xl px-4 py-2 text-right" style={{ backgroundColor: 'hsl(var(--background) / 0.72)' }}>
                      <p className="text-2xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                        {acceptedAppointments.length}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Once the doctor creates the consultation room, you can open the appointment and join from there.
                  </p>
                </div>

                {acceptedAppointments.length > 0 ? (
                  acceptedAppointments.map((appointment) => (
                    <PatientAppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      session={sessionsByAppointmentId[appointment.id]}
                      onSelect={handleOpenAppointment}
                    />
                  ))
                ) : (
                  <FeatureNotice
                    tone="info"
                    title="No accepted visits yet"
                    message="Accepted consultations will appear here as soon as a doctor confirms your telemedicine appointment."
                  />
                )}
              </div>
            </div>
          )}
        </TelemedicineSection>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                setSelectedAppointmentId(null)
                setPatientJoinInfo(null)
                setSessionActionState(EMPTY_ACTION_STATE)
              }}
              className={actionButtonClass()}
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            >
              Back to my appointments
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selectedAppointment.status} />
              {selectedSession ? <StatusBadge status={selectedSession.sessionStatus} /> : null}
            </div>
          </div>

          <TelemedicineSection
            title="Appointment Details"
            description="Review your scheduled visit, doctor reference, and the current telemedicine status before joining."
            action={(
              <button
                type="button"
                onClick={() => refreshAppointments({ preferredAppointmentId: selectedAppointment.id })}
                className={actionButtonClass()}
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
              >
                <RefreshCcw className={`mr-2 h-4 w-4 ${appointmentsLoading ? 'animate-spin' : ''}`} />
                Refresh appointment
              </button>
            )}
          >
            <div className="grid gap-5 xl:grid-cols-[1.35fr,0.95fr]">
              <div className="space-y-5 rounded-[28px] border p-6" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={selectedAppointment.status} />
                      {selectedSession ? <StatusBadge status={selectedSession.sessionStatus} className="opacity-85" /> : null}
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                        {selectedAppointment.reasonForVisit || 'Telemedicine consultation'}
                      </h2>
                      <p className="mt-2 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Scheduled for {formatDateTime(selectedAppointment.scheduledAt)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.72)' }}>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Appointment ID
                    </p>
                    <p className="mt-2 text-sm font-semibold break-all" style={{ color: 'hsl(var(--foreground))' }}>
                      {selectedAppointment.id}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[22px] border p-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.68)' }}>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Patient
                    </p>
                    <p className="mt-2 text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {selectedAppointment.patientDisplay?.name || patientDisplay.name}
                    </p>
                    <div className="mt-3 space-y-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      <p>{selectedAppointment.patientDisplay?.email || patientDisplay.email || 'Email not available'}</p>
                      <p>DOB: {selectedAppointment.patientDisplay?.dob || patientDisplay.dob || 'Not available'}</p>
                      <p>User ID: {selectedAppointment.patientDisplay?.userId || patientDisplay.userId}</p>
                    </div>
                  </div>

                  <div className="rounded-[22px] border p-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.68)' }}>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Doctor reference
                    </p>
                    <p className="mt-2 text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {selectedAppointment.doctorDisplay?.name || 'Doctor'}
                    </p>
                    <div className="mt-3 space-y-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      <p>{selectedAppointment.doctorDisplay?.email || 'Doctor contact will appear once connected'}</p>
                      <p>Doctor ID: {selectedAppointment.doctorId || 'Not available'}</p>
                      <p>Status: {selectedAppointment.doctorDisplay?.knownDoctor ? 'Known provider profile' : 'Provider details limited in demo mode'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border p-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.68)' }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Appointment notes
                  </p>
                  <p className="mt-3 text-sm leading-7" style={{ color: 'hsl(var(--foreground))' }}>
                    {selectedAppointment.notes || 'No extra notes were added for this consultation.'}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[28px] border p-6" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Consultation status
                  </p>
                  <p className="mt-3 text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                    {selectedSession ? getSessionStateCopy(selectedSession.sessionStatus) : selectedAppointment.status === 'ACCEPTED'
                      ? 'This appointment is accepted. We are waiting for the doctor to create the consultation room.'
                      : 'This visit is not ready to join yet. It will become available after doctor confirmation.'}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.68)' }}>
                      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Room status
                      </p>
                      <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                        {selectedSession ? selectedSession.sessionStatus : 'Room not created yet'}
                      </p>
                    </div>
                    <div className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.68)' }}>
                      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Readiness
                      </p>
                      <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                        {selectedReadiness?.ready
                          ? 'Both sides are ready'
                          : selectedSession
                            ? 'Waiting for both participants'
                            : 'Waiting for session setup'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border p-6" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                    <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      Readiness snapshot
                    </p>
                  </div>
                  <div className="mt-4 space-y-3 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <p>Patient joined: {selectedReadiness?.patientJoined ? 'Yes' : selectedSession?.patientJoinedAt ? 'Yes' : 'Not yet'}</p>
                    <p>Doctor joined: {selectedReadiness?.doctorJoined ? 'Yes' : selectedSession?.doctorJoinedAt ? 'Yes' : 'Not yet'}</p>
                    <p>Last session update: {selectedSession ? formatDateTime(selectedSession.updatedAt || selectedSession.startedAt || selectedAppointment.updatedAt) : 'Waiting for room creation'}</p>
                  </div>
                </div>
              </div>
            </div>
          </TelemedicineSection>

          <TelemedicineSection
            title="Session Access"
            description="Refresh the room status or prepare your own join access when the consultation is ready."
            action={(
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    refreshAppointments({ preferredAppointmentId: selectedAppointment.id })
                    refreshSessionsForAppointments(enrichedAppointments, { showLoading: false })
                    if (selectedSession) {
                      refreshReadinessForSession(selectedSession)
                    }
                  }}
                  className={actionButtonClass()}
                  style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh status
                </button>
                <button
                  type="button"
                  onClick={handleJoinConsultation}
                  disabled={!selectedSession || sessionActionState.loading}
                  className={actionButtonClass('primary')}
                  style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                >
                  <Video className={`mr-2 h-4 w-4 ${sessionActionState.loading ? 'animate-pulse' : ''}`} />
                  Join consultation
                </button>
              </div>
            )}
          >
            <div className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
              <div className="rounded-[28px] border p-6" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.68)' }}>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Appointment state
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {selectedAppointment.status}
                    </p>
                  </div>
                  <div className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.68)' }}>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Session state
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {selectedSession?.sessionStatus || 'Session not created'}
                    </p>
                  </div>
                  <div className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.68)' }}>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Jitsi room
                    </p>
                    <p className="mt-2 text-sm font-semibold break-all" style={{ color: 'hsl(var(--foreground))' }}>
                      {selectedSession?.jitsiRoomId || 'Room pending'}
                    </p>
                  </div>
                  <div className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.68)' }}>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Patient join access
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {patientJoinInfo ? 'Ready below' : 'Not generated'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[22px] border p-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.68)' }}>
                  <p className="text-sm leading-7" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {!selectedSession
                      ? selectedAppointment.status === 'ACCEPTED'
                        ? 'This appointment is accepted, but the doctor has not created the room yet. Refresh again in a moment.'
                        : 'This appointment still needs doctor confirmation before a room can be created.'
                      : selectedReadiness?.ready
                        ? 'Both sides are ready. You can join the call now.'
                        : 'You can prepare your patient join access now. The consultation becomes smoother once both sides have joined.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {sessionActionState.error ? (
                  <FeatureNotice tone="error" title="Unable to prepare consultation" message={sessionActionState.error} />
                ) : null}

                {sessionActionState.success ? (
                  <FeatureNotice tone="success" title="Consultation access ready" message={sessionActionState.success} />
                ) : null}

                {selectedSession ? (
                  <FeatureNotice
                    tone={selectedReadiness?.ready ? 'success' : 'info'}
                    title={selectedReadiness?.ready ? 'You can join now' : 'Waiting room update'}
                    message={selectedReadiness?.ready
                      ? 'Doctor and patient readiness checks both look good. Join the meeting below whenever you are ready.'
                      : 'The page keeps watching the session status for you. If the doctor creates or updates the room, this view will refresh automatically.'}
                  />
                ) : (
                  <FeatureNotice
                    tone="warning"
                    title="Room not available yet"
                    message="The consultation room will appear here after the doctor accepts the appointment and creates the session."
                  />
                )}

                <div className="rounded-[28px] border p-6" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Session lookup
                  </p>
                  <p className="mt-3 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                    {sessionLookupLoading ? 'Refreshing room details...' : 'Room details are up to date'}
                  </p>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Keep this appointment open while you are waiting. We will keep checking the room readiness while the consultation is active.
                  </p>
                </div>
              </div>
            </div>
          </TelemedicineSection>

          <LiveConsultationPanel
            currentUser={user}
            session={selectedSession}
            joinInfo={patientJoinInfo}
            participantLabel="patient"
          />
        </div>
      )}

      <div className="flex justify-start">
        <Link
          to="/patient/dashboard"
          className="inline-flex items-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
          style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}

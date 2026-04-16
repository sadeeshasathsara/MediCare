import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  HeartPulse,
  Loader2,
  Pill,
  RefreshCcw,
  Stethoscope,
  User,
  Video,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { getAuthItem } from '@/services/authStorage'
import FeatureNotice from '@/features/telemedicine/components/FeatureNotice'
import LiveConsultationPanel from '@/features/telemedicine/components/LiveConsultationPanel'
import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import {
  getJoinToken,
  getSessionReady,
  listAppointments,
  listConsultations,
  listPrescriptions,
  listSessions,
} from '@/features/telemedicine/services/telemedicineApi'
import {
  appointmentBelongsToPatient,
  enrichTelemedicineAppointment,
  formatDate,
  formatDateTime,
  getErrorMessage,
  getTelemedicinePatientIdentifiers,
  getSessionStateCopy,
  READY_POLL_STATUSES,
  resolveTelemedicinePatient,
} from '@/features/telemedicine/services/telemedicineTypes'

/* ─── Constants ──────────────────────────────────────────────────────────── */

const SCHEDULED_APPOINTMENT_STATUSES = new Set(['PENDING', 'RESCHEDULED'])
const ACTIVE_PATIENT_STATUSES        = new Set(['PENDING', 'ACCEPTED', 'RESCHEDULED'])
const EMPTY_ACTION_STATE = { kind: '', loading: false, error: '', success: '' }

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function decodeJwtSubject(token) {
  try {
    const parts = String(token || '').split('.')
    if (parts.length < 2) return null
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const r = payload.length % 4
    if (r === 2) payload += '=='
    if (r === 3) payload += '='
    return JSON.parse(atob(payload))?.sub || null
  } catch { return null }
}

function safeJsonParse(v) {
  if (!v) return null
  try { return JSON.parse(v) } catch { return null }
}

function normalizeId(v) { return v === undefined || v === null ? '' : String(v).trim() }

function actionLoading(kind)           { return { kind, loading: true,  error: '',    success: '' } }
function actionSuccess(kind, success)  { return { kind, loading: false, error: '',    success      } }
function actionError(kind, error)      { return { kind, loading: false, error,        success: '' } }

/* ─── Status colour helpers ──────────────────────────────────────────────── */

/* ─── Countdown helper ───────────────────────────────────────────────────── */

function countdown(scheduledAt) {
  if (!scheduledAt) return null
  const ms = new Date(scheduledAt).getTime() - Date.now()
  if (ms < 0) return { label: 'Past due', urgent: true, overdue: true }
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return { label: `${mins}m`, urgent: mins <= 30, overdue: false }
  const h = Math.floor(mins / 60), m = mins % 60
  return { label: `${h}h ${m}m`, urgent: false, overdue: false }
}

/* ─── Appointment card (list mode) ──────────────────────────────────────── */

function AppointmentCard({ appointment, session, onSelect }) {
  const isLive      = session?.sessionStatus === 'LIVE'
  const isWaiting   = session?.sessionStatus === 'WAITING'
  const hasRoom     = Boolean(session)
  const cd          = countdown(appointment.scheduledAt)
  const needsReview = SCHEDULED_APPOINTMENT_STATUSES.has(appointment.status)

  const borderClass = isLive
    ? 'border-red-300 dark:border-red-700/60'
    : needsReview
      ? 'border-amber-200 dark:border-amber-700/40'
      : 'border-border'

  const bgClass = isLive
    ? 'bg-red-50/70 dark:bg-red-950/20'
    : needsReview
      ? 'bg-amber-50/60 dark:bg-amber-950/15'
      : 'bg-card'

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment.id)}
      className={`group w-full rounded-2xl border-2 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${borderClass} ${bgClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={appointment.status} />
            {session && <StatusBadge status={session.sessionStatus} />}
          </div>

          {/* Reason */}
          <p className="truncate text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {appointment.reasonForVisit || 'Telemedicine Consultation'}
          </p>

          {/* Doctor */}
          <div className="flex items-center gap-1.5 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <Stethoscope className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {appointment.doctorDisplay?.knownDoctor
                ? appointment.doctorDisplay.name
                : 'Assigned Doctor'}
            </span>
          </div>
        </div>

        {/* Date + countdown */}
        <div className="shrink-0 text-right space-y-1.5">
          <p className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {formatDateTime(appointment.scheduledAt)}
          </p>
          {cd && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                cd.overdue
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  : cd.urgent
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
              }`}
            >
              <Clock className="h-3 w-3" />
              {cd.label}
            </span>
          )}
        </div>
      </div>

      {/* Session status strip */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          <Video className="h-3.5 w-3.5" />
          {isLive
            ? 'Session is LIVE — Join now'
            : isWaiting
              ? 'Doctor is in the waiting room'
              : hasRoom
                ? 'Room ready — Waiting for doctor to start'
                : appointment.status === 'ACCEPTED'
                  ? 'Waiting for doctor to create the room'
                  : 'Waiting for doctor confirmation'}
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold group-hover:gap-2 transition-all" style={{ color: 'hsl(var(--primary))' }}>
          {isLive ? 'Join now' : 'Open'}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}

/* ─── Readiness indicator ──────────────────────────────────────────────────*/

function ReadinessRow({ label, joined }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3" style={{ backgroundColor: 'hsl(var(--background) / 0.6)' }}>
      <span className="text-sm font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${joined ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
        {joined ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
        {joined ? 'Joined' : 'Not yet'}
      </span>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function PatientTelemedicinePage() {
  const navigate = useNavigate()
  const { appointmentId: routeAppointmentId } = useParams()
  const { user, accessToken } = useAuth()

  const patientIdentifiers = useMemo(() => {
    const storedUser = safeJsonParse(getAuthItem('user'))
    const identifiers = new Set([
      ...getTelemedicinePatientIdentifiers(user),
      ...getTelemedicinePatientIdentifiers(storedUser),
    ])
    const tokenSubject = normalizeId(decodeJwtSubject(accessToken || getAuthItem('accessToken')))
    if (tokenSubject) identifiers.add(tokenSubject)
    return Array.from(identifiers)
  }, [accessToken, user])

  const patientId = patientIdentifiers[0] || ''
  const selectedAppointmentIdRef = useRef(null)

  const [appointments,        setAppointments]        = useState([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [appointmentsError,   setAppointmentsError]   = useState('')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null)

  const [sessionsByAppointmentId, setSessionsByAppointmentId] = useState({})
  const [sessionLookupLoading,    setSessionLookupLoading]    = useState(false)
  const [sessionError,            setSessionError]            = useState('')
  const [readinessBySessionId,    setReadinessBySessionId]    = useState({})
  const [patientJoinInfo,         setPatientJoinInfo]         = useState(null)
  const [sessionActionState,      setSessionActionState]      = useState(EMPTY_ACTION_STATE)
  const [consultationsBySessionId, setConsultationsBySessionId] = useState({})
  const [prescriptionsByConsultationId, setPrescriptionsByConsultationId] = useState({})
  const [clinicalLoading, setClinicalLoading] = useState(false)
  const [clinicalError, setClinicalError] = useState('')

  const patientDisplay = useMemo(() => {
    const resolved = resolveTelemedicinePatient(patientId)
    return { ...resolved, name: user?.name || resolved.name, email: user?.email || resolved.email }
  }, [patientId, user?.email, user?.name])

  const enrichedAppointments = useMemo(
    () => appointments.map((a) => enrichTelemedicineAppointment(a, null, a.doctorId)),
    [appointments]
  )
  const deferredAppointments = useDeferredValue(enrichedAppointments)

  const scheduledAppointments = deferredAppointments.filter((a) => SCHEDULED_APPOINTMENT_STATUSES.has(a.status))
  const acceptedAppointments  = deferredAppointments.filter((a) => a.status === 'ACCEPTED')

  const selectedAppointment = enrichedAppointments.find((a) => a.id === selectedAppointmentId) || null
  const selectedSession     = selectedAppointment ? sessionsByAppointmentId[selectedAppointment.id] || null : null
  const selectedReadiness   = selectedSession ? readinessBySessionId[selectedSession.id] || null : null
  const selectedConsultation = selectedSession ? consultationsBySessionId[selectedSession.id] || null : null
  const selectedPrescriptions = selectedConsultation ? prescriptionsByConsultationId[selectedConsultation.id] || [] : []

  const selectedSessionId              = selectedSession?.id || null
  const selectedSessionAppointmentId   = selectedSession?.appointmentId || null
  const selectedSessionStatus          = selectedSession?.sessionStatus || null

  const activeAppointmentCount = scheduledAppointments.length + acceptedAppointments.length
  const joinableCount          = acceptedAppointments.filter((a) => Boolean(sessionsByAppointmentId[a.id])).length
  const liveCount              = acceptedAppointments.filter((a) => sessionsByAppointmentId[a.id]?.sessionStatus === 'LIVE').length

  useEffect(() => { selectedAppointmentIdRef.current = selectedAppointmentId }, [selectedAppointmentId])

  useEffect(() => {
    setSelectedAppointmentId(routeAppointmentId || null)
  }, [routeAppointmentId])

  /* ── Data fetching ── */

  const refreshAppointments = useCallback(async ({ preferredAppointmentId = null, preserveSelection = true } = {}) => {
    if (!patientIdentifiers.length) {
      startTransition(() => { setAppointments([]); setSelectedAppointmentId(null) })
      setAppointmentsLoading(false)
      setAppointmentsError('Unable to resolve your patient account. Please sign out and sign in again.')
      return
    }
    setAppointmentsLoading(true)
    setAppointmentsError('')
    try {
      const settled = await Promise.allSettled(
        patientIdentifiers.map((id) => listAppointments({ patientId: id }))
      )
      const ok = settled.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value || [])
      if (!ok.length && settled.every((r) => r.status === 'rejected')) {
        throw settled.find((r) => r.status === 'rejected')?.reason || new Error('Unable to load appointments.')
      }
      const idSet = new Set(patientIdentifiers)
      const byId  = new Map()
      ok.forEach((a) => {
        if (!a?.id) return
        if (!ACTIVE_PATIENT_STATUSES.has(a.status)) return
        if (!appointmentBelongsToPatient(a, { ...user, id: patientId }) && !idSet.has(String(a.patientId || ''))) return
        byId.set(a.id, a)
      })
      const next = Array.from(byId.values()).sort(
        (l, r) => new Date(l?.scheduledAt || 0).getTime() - new Date(r?.scheduledAt || 0).getTime()
      )
      startTransition(() => {
        setAppointments(next)
        let sel = null
        if (preferredAppointmentId && next.some((a) => a.id === preferredAppointmentId)) sel = preferredAppointmentId
        else if (preserveSelection && selectedAppointmentIdRef.current && next.some((a) => a.id === selectedAppointmentIdRef.current)) sel = selectedAppointmentIdRef.current
        setSelectedAppointmentId(sel)
      })
    } catch (err) {
      setAppointmentsError(getErrorMessage(err, 'Unable to load your telemedicine appointments.'))
    } finally {
      setAppointmentsLoading(false)
    }
  }, [patientId, patientIdentifiers, user])

  const refreshSessionsForAppointments = useCallback(async (list, { showLoading = true } = {}) => {
    if (showLoading) setSessionLookupLoading(true)
    setSessionError('')
    try {
      const ids = new Set((list || []).map((a) => a.id))
      if (!ids.size) { startTransition(() => setSessionsByAppointmentId({})); return }
      const sessions = await listSessions()
      const map = sessions.reduce((m, s) => { if (ids.has(s.appointmentId)) m[s.appointmentId] = s; return m }, {})
      startTransition(() => setSessionsByAppointmentId(map))
    } catch (err) {
      setSessionError(getErrorMessage(err, 'Unable to load consultation session details.'))
    } finally {
      if (showLoading) setSessionLookupLoading(false)
    }
  }, [])

  const refreshReadinessForSession = useCallback(async (session) => {
    if (!session?.id) return null
    try {
      const r = await getSessionReady(session.id)
      startTransition(() => {
        setReadinessBySessionId((c) => ({ ...c, [session.id]: r }))
        setSessionsByAppointmentId((c) => {
          const cur = c[session.appointmentId]
          if (!cur || cur.sessionStatus === r.sessionStatus) return c
          return { ...c, [session.appointmentId]: { ...cur, sessionStatus: r.sessionStatus } }
        })
      })
      return r
    } catch (err) {
      setSessionError(getErrorMessage(err, 'Unable to refresh consultation readiness.'))
      return null
    }
  }, [])

  const refreshConsultationForSession = useCallback(async (session) => {
    if (!session?.id) return null

    try {
      const consultations = await listConsultations()
      const consultation = consultations.find((item) => item.sessionId === session.id) || null

      startTransition(() => {
        setConsultationsBySessionId((current) => ({
          ...current,
          [session.id]: consultation,
        }))
      })

      return consultation
    } catch (err) {
      setClinicalError(getErrorMessage(err, 'Unable to load consultation details for this session.'))
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
    } catch (err) {
      setClinicalError(getErrorMessage(err, 'Unable to load prescriptions for this consultation.'))
      return []
    }
  }, [])

  const refreshClinicalDetailsForSession = useCallback(async (session) => {
    if (!session?.id || session.sessionStatus !== 'COMPLETED') return

    setClinicalError('')
    setClinicalLoading(true)
    const consultation = await refreshConsultationForSession(session)
    if (consultation?.id) {
      await refreshPrescriptionsForConsultation(consultation.id)
    }
    setClinicalLoading(false)
  }, [refreshConsultationForSession, refreshPrescriptionsForConsultation])

  useEffect(() => {
    refreshAppointments({ preserveSelection: Boolean(routeAppointmentId), preferredAppointmentId: routeAppointmentId || null })
  }, [refreshAppointments, routeAppointmentId])
  useEffect(() => { refreshSessionsForAppointments(appointments, { showLoading: false }) }, [appointments, refreshSessionsForAppointments])

  useEffect(() => {
    if (!selectedSessionId || !READY_POLL_STATUSES.has(selectedSessionStatus)) return undefined
    const s = { id: selectedSessionId, appointmentId: selectedSessionAppointmentId }
    refreshReadinessForSession(s)
    const id = window.setInterval(() => refreshReadinessForSession(s), 5000)
    return () => window.clearInterval(id)
  }, [refreshReadinessForSession, selectedSessionAppointmentId, selectedSessionId, selectedSessionStatus])

  useEffect(() => {
    if (!selectedSession) { setPatientJoinInfo(null); return }
    if (patientJoinInfo && patientJoinInfo.sessionId !== selectedSession.id) setPatientJoinInfo(null)
  }, [patientJoinInfo, selectedSession])

  useEffect(() => {
    if (!selectedSession?.id || selectedSession.sessionStatus !== 'COMPLETED') {
      return
    }

    refreshClinicalDetailsForSession(selectedSession)
  }, [refreshClinicalDetailsForSession, selectedSession])

  /* ── Handlers ── */

  const handleOpenAppointment = useCallback((id) => {
    navigate(`/patient/telemedicine/${id}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [navigate])

  const handleBack = useCallback(() => {
    navigate('/patient/telemedicine')
    setPatientJoinInfo(null)
    setSessionActionState(EMPTY_ACTION_STATE)
  }, [navigate])

  const handleJoinConsultation = async () => {
    if (!selectedSession || !selectedAppointment) return
    setSessionActionState(actionLoading('join'))
    try {
      const info = await getJoinToken(selectedSession.id, 'patient', true)
      setPatientJoinInfo(info)
      await refreshSessionsForAppointments(enrichedAppointments, { showLoading: false })
      await refreshReadinessForSession(selectedSession)
      setSessionActionState(actionSuccess('join', 'Consultation access is ready. You can join below.'))
    } catch (err) {
      setSessionActionState(actionError('join', getErrorMessage(err, 'Unable to prepare your consultation access.')))
    }
  }

  /* ─────────────────────────────────────────────────────────────────────── */
  /* ── RENDER: APPOINTMENT LIST (no appointment selected) ─────────────── */
  /* ─────────────────────────────────────────────────────────────────────── */

  if (!selectedAppointment) {
    return (
      <div className="space-y-6">

        {/* ── Hero banner ── */}
        <section
          className="relative overflow-hidden rounded-[28px] border p-6 md:p-8"
          style={{
            borderColor: 'hsl(var(--border))',
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--accent) / 0.25) 60%, hsl(var(--background)) 100%)',
          }}
        >
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }} />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: greeting */}
            <div className="space-y-3 max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--primary))' }}>
                <HeartPulse className="h-3.5 w-3.5" />
                Patient Portal
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ color: 'hsl(var(--foreground))' }}>
                Hello, {patientDisplay.name || 'there'} 👋
              </h1>
              <p className="text-sm leading-7" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Your telemedicine visits are listed below. When your doctor accepts a request and opens the session room, you&apos;ll be able to join directly from here.
              </p>
            </div>

            {/* Right: stat chips */}
            <div className="flex flex-wrap gap-3 lg:flex-col lg:items-end">
              {[
                { label: 'Awaiting Confirmation', value: scheduledAppointments.length, color: 'bg-amber-500' },
                { label: 'Confirmed Visits',       value: acceptedAppointments.length,  color: 'bg-emerald-600' },
                { label: 'Rooms Ready to Join',   value: joinableCount,                color: 'bg-indigo-500' },
                { label: 'Live Right Now',         value: liveCount,                   color: 'bg-red-500' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 rounded-2xl border px-4 py-3 min-w-45"
                  style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card) / 0.85)' }}>
                  <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.color} ${s.value > 0 && s.color === 'bg-red-500' ? 'animate-pulse' : ''}`} />
                  <span className="flex-1 text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{s.label}</span>
                  <span className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Errors ── */}
        {appointmentsError && <FeatureNotice tone="error" title="Unable to load appointments" message={appointmentsError} />}
        {sessionError && <FeatureNotice tone="warning" title="Session updates limited" message={sessionError} />}

        {/* ── Appointment list card ── */}
        <section
          className="rounded-[28px] border p-6"
          style={{
            borderColor: 'hsl(var(--border))',
            backgroundColor: 'hsl(var(--card) / 0.97)',
          }}
        >
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'hsl(var(--primary) / 0.12)' }}>
                  <CalendarClock className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                  My Telemedicine Appointments
                </h2>
              </div>
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Open any visit to view details and join the consultation when the room is ready.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refreshAppointments({ preserveSelection: false })}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-black/3 dark:hover:bg-white/5"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            >
              <RefreshCcw className={`h-4 w-4 ${appointmentsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Loading skeletons */}
          {appointmentsLoading && (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`sk-${i}`} className="animate-pulse rounded-2xl border p-5 space-y-3"
                  style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--muted) / 0.3)' }}>
                  <div className="flex gap-2"><div className="h-6 w-20 rounded-full bg-black/10 dark:bg-white/10" /><div className="h-6 w-16 rounded-full bg-black/10 dark:bg-white/10" /></div>
                  <div className="h-5 w-48 rounded bg-black/10 dark:bg-white/10" />
                  <div className="h-4 w-32 rounded bg-black/10 dark:bg-white/10" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!appointmentsLoading && activeAppointmentCount === 0 && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
                <Video className="h-7 w-7" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>No telemedicine visits yet</p>
                <p className="max-w-sm text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Appointments will appear here once scheduled. You can also book a visit through your appointments page.
                </p>
              </div>
              <Link to="/patient/appointments/new"
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-black/3 dark:hover:bg-white/5"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                <CalendarClock className="h-4 w-4" />
                View Appointments
              </Link>
            </div>
          )}

          {/* Appointment grid */}
          {!appointmentsLoading && activeAppointmentCount > 0 && (
            <div className="space-y-6">
              {/* Live / active sessions first — highlighted */}
              {liveCount > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-[0.14em]">Live Now</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {acceptedAppointments
                      .filter((a) => sessionsByAppointmentId[a.id]?.sessionStatus === 'LIVE')
                      .map((a) => (
                        <AppointmentCard key={a.id} appointment={a} session={sessionsByAppointmentId[a.id] || null} onSelect={handleOpenAppointment} />
                      ))}
                  </div>
                </div>
              )}

              {/* Confirmed (non-live) */}
              {acceptedAppointments.filter((a) => sessionsByAppointmentId[a.id]?.sessionStatus !== 'LIVE').length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <p className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--foreground))' }}>Confirmed Visits</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {acceptedAppointments
                      .filter((a) => sessionsByAppointmentId[a.id]?.sessionStatus !== 'LIVE')
                      .map((a) => (
                        <AppointmentCard key={a.id} appointment={a} session={sessionsByAppointmentId[a.id] || null} onSelect={handleOpenAppointment} />
                      ))}
                  </div>
                </div>
              )}

              {/* Pending / rescheduled */}
              {scheduledAppointments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <p className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--foreground))' }}>Awaiting Confirmation</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {scheduledAppointments.map((a) => (
                      <AppointmentCard key={a.id} appointment={a} session={sessionsByAppointmentId[a.id] || null} onSelect={handleOpenAppointment} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    )
  }

  /* ─────────────────────────────────────────────────────────────────────── */
  /* ── RENDER: APPOINTMENT WORKSPACE (appointment selected) ────────────── */
  /* ─────────────────────────────────────────────────────────────────────── */

  const isLive       = selectedSession?.sessionStatus === 'LIVE'
  const isWaiting    = selectedSession?.sessionStatus === 'WAITING'
  const isCompleted  = selectedSession?.sessionStatus === 'COMPLETED'
  const hasRoom      = Boolean(selectedSession)
  const canJoin      = hasRoom && !isCompleted
  const doctorName   = selectedAppointment.doctorDisplay?.name || 'Your Doctor'
  const patientName  = selectedAppointment.patientDisplay?.name || patientDisplay.name

  return (
    <div className="space-y-5">

      {/* ── Hero workspace header ── */}
      <div
        className="relative overflow-hidden rounded-[28px] border p-6"
        style={{
          borderColor: 'hsl(var(--border))',
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.13) 0%, hsl(var(--accent) / 0.28) 60%, hsl(var(--background)) 100%)',
        }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }} />

        <div className="relative space-y-4">
          {/* Top bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition hover:bg-black/4 dark:hover:bg-white/6"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            >
              <ArrowLeft className="h-4 w-4" />
              My Appointments
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selectedAppointment.status} />
              {selectedSession && <StatusBadge status={selectedSession.sessionStatus} />}
            </div>
          </div>

          {/* Patient + reason */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Your Consultation
              </p>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                {selectedAppointment.reasonForVisit || 'Telemedicine Consultation'}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5" />
                  {doctorName}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatDateTime(selectedAppointment.scheduledAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {patientName}
                </span>
              </div>
            </div>

            {/* Status summary chip */}
            <div
              className={`shrink-0 rounded-2xl border px-5 py-3 text-center ${
                isLive ? 'border-red-300 bg-red-50 dark:border-red-700/50 dark:bg-red-950/30'
                : isWaiting ? 'border-orange-300 bg-orange-50 dark:border-orange-700/50 dark:bg-orange-950/30'
                : hasRoom ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700/50 dark:bg-emerald-950/30'
                : 'border-border'
              }`}
              style={!isLive && !isWaiting && !hasRoom ? { backgroundColor: 'hsl(var(--card) / 0.7)' } : {}}
            >
              <p className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--muted-foreground))' }}>Status</p>
              <p className={`mt-1 text-sm font-bold ${
                isLive ? 'text-red-600 dark:text-red-400'
                : isWaiting ? 'text-orange-600 dark:text-orange-400'
                : hasRoom ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-foreground'
              }`}
                style={!isLive && !isWaiting && !hasRoom && !isCompleted ? { color: 'hsl(var(--foreground))' } : {}}>
                {isLive ? '🔴 Session is Live' : isWaiting ? '⏳ Doctor in waiting room' : hasRoom ? '✅ Room is Ready' : '⏳ Waiting for Doctor'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">

        {/* LEFT col: appointment info */}
        <div className="space-y-4">

          {/* Appointment notes */}
          {selectedAppointment.notes && (
            <section className="rounded-2xl border p-5" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--muted-foreground))' }}>Your Notes</p>
              <p className="mt-3 text-sm leading-7" style={{ color: 'hsl(var(--foreground))' }}>
                {selectedAppointment.notes}
              </p>
            </section>
          )}

          {/* Doctor info */}
          <section className="rounded-2xl border p-5" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--muted-foreground))' }}>Your Doctor</p>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'hsl(var(--primary) / 0.12)' }}>
                <Stethoscope className="h-6 w-6" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div className="space-y-1">
                <p className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{doctorName}</p>
                <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {selectedAppointment.doctorDisplay?.email || 'Contact available after connection'}
                </p>
              </div>
            </div>
          </section>

          {/* Appointment meta */}
          <section className="rounded-2xl border p-5" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--muted-foreground))' }}>Appointment Info</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Reason',    value: selectedAppointment.reasonForVisit || 'Consultation' },
                { label: 'Scheduled', value: formatDateTime(selectedAppointment.scheduledAt) },
                { label: 'Appointment Status', value: <StatusBadge status={selectedAppointment.status} /> },
                { label: 'Session Room',
                  value: selectedSession
                    ? <span className="font-mono text-xs">{selectedSession.jitsiRoomId}</span>
                    : <span style={{ color: 'hsl(var(--muted-foreground))' }}>Not created yet</span>
                },
              ].map((row) => (
                <div key={row.label} className="rounded-xl p-3" style={{ backgroundColor: 'hsl(var(--background) / 0.6)' }}>
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--muted-foreground))' }}>{row.label}</p>
                  <div className="mt-1.5 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{row.value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT col: readiness + join */}
        <div className="space-y-4">

          {/* Session status + readiness */}
          <section className="rounded-2xl border p-5" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--muted-foreground))' }}>Session Status</p>
              <button
                type="button"
                onClick={() => {
                  refreshAppointments({ preferredAppointmentId: selectedAppointment.id })
                  refreshSessionsForAppointments(enrichedAppointments, { showLoading: false })
                  if (selectedSession) refreshReadinessForSession(selectedSession)
                  if (selectedSession?.sessionStatus === 'COMPLETED') {
                    refreshClinicalDetailsForSession(selectedSession)
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-black/4 dark:hover:bg-white/6"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                <RefreshCcw className={`h-3.5 w-3.5 ${sessionLookupLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <p className="mb-4 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {!hasRoom
                ? selectedAppointment.status === 'ACCEPTED'
                  ? 'Your appointment is confirmed. Waiting for the doctor to open the session room.'
                  : 'This visit is pending doctor confirmation. We\'ll update this page automatically.'
                : isCompleted
                  ? 'This consultation has been completed. Thank you for your visit.'
                  : isLive
                    ? 'The session is live! Join now to connect with your doctor.'
                    : isWaiting
                      ? 'Your doctor has joined the waiting room. You can join now.'
                      : getSessionStateCopy(selectedSession.sessionStatus)}
            </p>

            <div className="space-y-2">
              <ReadinessRow label="Doctor joined" joined={Boolean(selectedReadiness?.doctorJoined || selectedSession?.doctorJoinedAt)} />
              <ReadinessRow label="Patient joined" joined={Boolean(selectedReadiness?.patientJoined || selectedSession?.patientJoinedAt)} />
            </div>

            {selectedSession && (
              <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-3"
                style={{ backgroundColor: selectedReadiness?.ready ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--background) / 0.6)' }}>
                {selectedReadiness?.ready
                  ? <Wifi className="h-4 w-4 text-emerald-500" />
                  : <WifiOff className="h-4 w-4" style={{ color: 'hsl(var(--muted-foreground))' }} />}
                <p className="text-sm font-semibold" style={{ color: selectedReadiness?.ready ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                  {selectedReadiness?.ready ? 'Both sides ready — you can start the call' : 'Waiting for both participants'}
                </p>
              </div>
            )}
          </section>

          {/* Join action card */}
          <section className="rounded-2xl border p-5" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--muted-foreground))' }}>Join Consultation</p>

            {sessionActionState.error && (
              <div className="mb-3"><FeatureNotice tone="error" title="Unable to prepare" message={sessionActionState.error} /></div>
            )}
            {sessionActionState.success && (
              <div className="mb-3"><FeatureNotice tone="success" title="Ready to join" message={sessionActionState.success} /></div>
            )}

            {!hasRoom && (
              <p className="mb-4 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {selectedAppointment.status === 'ACCEPTED'
                  ? 'The consultation room hasn\'t been created yet. The button will activate once your doctor opens it.'
                  : 'This visit needs doctor confirmation first.'}
              </p>
            )}

            <button
              type="button"
              onClick={handleJoinConsultation}
              disabled={!canJoin || sessionActionState.loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
            >
              {sessionActionState.loading && sessionActionState.kind === 'join'
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing access...</>
                : <><Video className="h-4 w-4" /> {isLive ? 'Join Live Session' : 'Prepare & Join'}</>}
            </button>

            {patientJoinInfo && (
              <p className="mt-3 text-center text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Access ready — scroll down to enter the meeting room below
              </p>
            )}
          </section>

          <section className="rounded-2xl border p-5" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Clinical Wrap-up
              </p>
            </div>

            {clinicalError ? <FeatureNotice tone="error" title="Unable to load wrap-up" message={clinicalError} /> : null}

            {!isCompleted ? (
              <FeatureNotice
                tone="info"
                title="Wrap-up available after consultation"
                message="Consultation summary and prescriptions will appear here once your doctor completes the session."
              />
            ) : null}

            {isCompleted && clinicalLoading ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading consultation details...
              </div>
            ) : null}

            {isCompleted && !clinicalLoading && !selectedConsultation ? (
              <FeatureNotice
                tone="warning"
                title="Wrap-up pending"
                message="Your consultation has ended, but the doctor has not saved consultation notes yet. Please check again shortly."
              />
            ) : null}

            {isCompleted && !clinicalLoading && selectedConsultation ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl p-3" style={{ backgroundColor: 'hsl(var(--background) / 0.6)' }}>
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--muted-foreground))' }}>Consultation ID</p>
                    <p className="mt-1.5 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{selectedConsultation.id}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ backgroundColor: 'hsl(var(--background) / 0.6)' }}>
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--muted-foreground))' }}>Follow-up Date</p>
                    <p className="mt-1.5 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {selectedConsultation.followUpDate ? formatDate(selectedConsultation.followUpDate) : 'Not scheduled'}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl p-3" style={{ backgroundColor: 'hsl(var(--background) / 0.6)' }}>
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--muted-foreground))' }}>Diagnosis</p>
                  <p className="mt-1.5 text-sm leading-6" style={{ color: 'hsl(var(--foreground))' }}>
                    {selectedConsultation.diagnosis || 'Not provided'}
                  </p>
                </div>

                <div className="rounded-xl p-3" style={{ backgroundColor: 'hsl(var(--background) / 0.6)' }}>
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--muted-foreground))' }}>Consultation Notes</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6" style={{ color: 'hsl(var(--foreground))' }}>
                    {selectedConsultation.doctorNotes || 'No notes available.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                    <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      Prescriptions
                    </p>
                  </div>

                  {selectedPrescriptions.length === 0 ? (
                    <FeatureNotice
                      tone="info"
                      title="No prescriptions issued"
                      message="Your doctor did not add any prescriptions for this consultation."
                    />
                  ) : (
                    <div className="space-y-3">
                      {selectedPrescriptions.map((prescription) => (
                        <div
                          key={prescription.id}
                          className="space-y-3 rounded-xl border p-3"
                          style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.6)' }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <StatusBadge status={prescription.prescriptionStatus} />
                                <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                  {prescription.id}
                                </span>
                              </div>
                              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                                {prescription.medications?.length || 0} medication{(prescription.medications?.length || 0) === 1 ? '' : 's'}
                              </p>
                            </div>
                            <div className="text-right text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                              <p>Issued: {formatDateTime(prescription.issuedAt)}</p>
                              <p>Expires: {formatDateTime(prescription.expiresAt)}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {(prescription.medications || []).map((medication, index) => (
                              <div
                                key={`${prescription.id}-${index}`}
                                className="rounded-lg border px-3 py-2"
                                style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                              >
                                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                                  {medication.name}
                                </p>
                                <p className="mt-1 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                  {medication.dosage} - {medication.frequency} - {medication.durationDays} day(s)
                                </p>
                                {medication.instructions ? (
                                  <p className="mt-1 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    {medication.instructions}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {/* ── Live Jitsi panel ── */}
      <LiveConsultationPanel
        currentUser={user}
        session={selectedSession}
        joinInfo={patientJoinInfo}
        participantLabel="patient"
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Hash,
  Mail,
  Stethoscope,
  User,
  Video,
} from 'lucide-react'

import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import { formatDateTime } from '@/features/telemedicine/services/telemedicineTypes'

/* ─── Workflow steps ─────────────────────────────────────────────────────── */

const STEPS = [
  { id: 'accept',  label: 'Accept',         icon: CheckCircle2  },
  { id: 'session', label: 'Create Session', icon: Video         },
  { id: 'join',    label: 'Doctor Joins',   icon: User          },
  { id: 'live',    label: 'Live Call',      icon: Stethoscope   },
  { id: 'wrapup',  label: 'Wrap-Up',        icon: ClipboardList },
]

function resolveStepIndex(appointment, session, consultation) {
  if (!appointment) return -1
  if (appointment.status !== 'ACCEPTED') return 0
  if (!session) return 1
  if (!['LIVE', 'COMPLETED'].includes(session.sessionStatus)) return 2
  if (session.sessionStatus === 'LIVE') return 3
  if (session.sessionStatus === 'COMPLETED' && !consultation) return 4
  if (consultation) return 5
  return 2
}

/* ─── Live countdown hook ────────────────────────────────────────────────── */

function useCountdown(scheduledAt, sessionStatus) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    // Only tick when the appointment is upcoming or overdue (not live/completed)
    if (['LIVE', 'COMPLETED', 'CANCELLED', 'MISSED'].includes(String(sessionStatus || '').toUpperCase())) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [sessionStatus])

  if (!scheduledAt) return null

  const diffMs  = new Date(scheduledAt).getTime() - Date.now()
  const absDiff = Math.abs(diffMs)
  const overdue = diffMs < 0

  if (['LIVE', 'COMPLETED', 'CANCELLED', 'MISSED'].includes(String(sessionStatus || '').toUpperCase())) {
    return null // hide timer when session is active/done
  }

  const totalSeconds = Math.floor(absDiff / 1000)
  const hours   = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n) => String(n).padStart(2, '0')

  const formatted = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`

  // Urgency levels
  let urgency = 'calm'    // > 60 min
  if (overdue)             urgency = 'overdue'   // past time
  else if (absDiff < 5 * 60 * 1000)  urgency = 'critical'   // < 5 min
  else if (absDiff < 30 * 60 * 1000) urgency = 'warning'    // < 30 min
  else if (absDiff < 60 * 60 * 1000) urgency = 'soon'       // < 1 hr

  return { formatted, overdue, urgency, diffMs }
}

/* ─── Countdown display ──────────────────────────────────────────────────── */

const URGENCY_CONFIG = {
  calm: {
    solid:  'bg-indigo-600',
    ring:   'ring-indigo-700',
    prefix: 'Starts in',
    pulse:  false,
  },
  soon: {
    solid:  'bg-sky-500',
    ring:   'ring-sky-600',
    prefix: 'Starts in',
    pulse:  false,
  },
  warning: {
    solid:  'bg-amber-500',
    ring:   'ring-amber-600',
    prefix: 'Starting soon',
    pulse:  true,
  },
  critical: {
    solid:  'bg-orange-500',
    ring:   'ring-orange-600',
    prefix: 'Starting NOW',
    pulse:  true,
  },
  overdue: {
    solid:  'bg-rose-600',
    ring:   'ring-rose-700',
    prefix: 'Overdue by',
    pulse:  true,
  },
}

function CountdownTimer({ scheduledAt, sessionStatus }) {
  const cd = useCountdown(scheduledAt, sessionStatus)
  if (!cd) return null

  const cfg = URGENCY_CONFIG[cd.urgency]

  return (
    <div className={`relative overflow-hidden rounded-2xl px-5 py-4 shadow-lg ring-1 ${cfg.solid} ${cfg.ring}`}>
      {/* subtle inner glow overlay */}
      <div className="pointer-events-none absolute inset-0 bg-white/10 dark:bg-black/10" />

      <div className="relative flex items-center gap-3">
        {/* dot */}
        <div className="relative flex h-3 w-3 shrink-0">
          {cfg.pulse && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
          )}
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
        </div>

        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
            {cfg.prefix}
          </p>
          <p className="font-mono text-2xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
            {cd.formatted}
          </p>
        </div>

        <Clock className="h-5 w-5 shrink-0 text-white/60" />
      </div>
    </div>
  )
}

/* ─── Progress Stepper ───────────────────────────────────────────────────── */

function ProgressStepper({ appointment, session, consultation }) {
  const activeIndex = resolveStepIndex(appointment, session, consultation)

  return (
    <div className="flex items-center overflow-x-auto pt-1 pb-0.5">
      {STEPS.map((step, i) => {
        const done    = i < activeIndex
        const current = i === activeIndex

        const circleClass = done
          ? 'bg-emerald-500 border-emerald-500 text-white'
          : current
            ? 'border-primary text-primary bg-white dark:bg-slate-900'
            : 'border-border text-muted-foreground bg-transparent dark:border-white/20'

        const labelClass = done
          ? 'text-emerald-600 dark:text-emerald-400'
          : current
            ? 'font-semibold'
            : 'opacity-50'

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${circleClass}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : <step.icon className="h-3.5 w-3.5" />}
              </div>
              <span
                className={`whitespace-nowrap text-[10px] uppercase tracking-[0.14em] transition-all duration-300 ${labelClass}`}
                style={{ color: current ? 'hsl(var(--foreground))' : undefined }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 mb-5 h-px w-10 shrink-0 transition-all duration-500 sm:w-14 ${done ? 'bg-emerald-400' : 'bg-border dark:bg-white/10'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Patient detail row ─────────────────────────────────────────────────── */

function DetailPill({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
      <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{label}:</span>
      <span className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
    </div>
  )
}

/* ─── Main export ────────────────────────────────────────────────────────── */

export default function ConsultationWorkspaceHeader({
  appointment,
  session,
  consultation,
  onBack,
}) {
  if (!appointment) return null

  const patientName   = appointment.patientDisplay?.name  || `Patient ${String(appointment.patientId || '').slice(0, 8).toUpperCase()}`
  const patientEmail  = appointment.patientDisplay?.email || null
  const patientDob    = appointment.patientDisplay?.dob   || null
  const patientUserId = appointment.patientDisplay?.userId || appointment.patientId || null

  const reason        = appointment.reasonForVisit || 'Consultation request'
  const scheduledAt   = formatDateTime(appointment.scheduledAt)
  const appointmentId = appointment.id ? String(appointment.id).slice(0, 8).toUpperCase() : null
  const sessionStatus = session?.sessionStatus || null
  const notes         = appointment.notes || null

  return (
    <div
      className="relative overflow-hidden rounded-[28px] border p-6"
      style={{
        borderColor: 'hsl(var(--border))',
        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.10) 0%, hsl(var(--accent) / 0.22) 55%, hsl(var(--background)) 100%)',
      }}
    >
      {/* Decorative blur blobs */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-10 right-40 h-36 w-36 rounded-full opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }} />

      <div className="relative space-y-5">

        {/* ── Row 1: Back button + status badges ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={appointment.status} />
            {sessionStatus && <StatusBadge status={sessionStatus} />}
            {consultation   && <StatusBadge status="COMPLETED" />}
          </div>
        </div>

        {/* ── Row 2: Patient identity + timer ── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

          {/* Left: patient + appointment info */}
          <div className="space-y-3 flex-1">
            {/* Patient name as hero */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Patient
              </p>
              <h2 className="mt-0.5 text-2xl font-bold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                {patientName}
              </h2>
            </div>

            {/* Patient detail pills */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <DetailPill icon={Mail}         label="Email"    value={patientEmail} />
              <DetailPill icon={CalendarClock} label="DOB"     value={patientDob} />
              <DetailPill icon={Hash}          label="ID"       value={patientUserId ? String(patientUserId).slice(0, 12) : null} />
            </div>

            {/* Divider */}
            <div className="h-px" style={{ backgroundColor: 'hsl(var(--border))' }} />

            {/* Appointment details */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              <DetailPill icon={Stethoscope}  label="Reason"    value={reason} />
              <DetailPill icon={CalendarClock} label="Scheduled" value={scheduledAt} />
              {appointmentId && (
                <DetailPill icon={Hash}        label="Appt"      value={`#${appointmentId}`} />
              )}
              {session?.jitsiRoomId && (
                <DetailPill icon={Video}       label="Room"      value={session.jitsiRoomId} />
              )}
            </div>

            {/* Notes (if any) */}
            {notes && (
              <p className="max-w-xl rounded-xl px-3 py-2 text-xs leading-5 italic"
                style={{ backgroundColor: 'hsl(var(--card) / 0.55)', color: 'hsl(var(--muted-foreground))' }}>
                &ldquo;{notes}&rdquo;
              </p>
            )}
          </div>

          {/* Right: countdown timer — only shows if session is not live/completed */}
          <div className="shrink-0 lg:min-w-[200px]">
            <CountdownTimer
              scheduledAt={appointment.scheduledAt}
              sessionStatus={sessionStatus}
            />
          </div>
        </div>

        {/* ── Row 3: Progress stepper ── */}
        <div
          className="rounded-2xl border px-4 py-3"
          style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card) / 0.55)' }}
        >
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Consultation Progress
          </p>
          <ProgressStepper appointment={appointment} session={session} consultation={consultation} />
        </div>

      </div>
    </div>
  )
}

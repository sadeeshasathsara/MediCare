import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
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

/** Derive the active step index from appointment + session state */
function resolveStepIndex(appointment, session, consultation) {
  if (!appointment) return -1
  if (appointment.status !== 'ACCEPTED') return 0                  // step 0 – accept
  if (!session) return 1                                            // step 1 – create session
  if (!['LIVE', 'COMPLETED'].includes(session.sessionStatus)) return 2  // step 2 – join
  if (session.sessionStatus === 'LIVE') return 3                   // step 3 – live
  if (session.sessionStatus === 'COMPLETED' && !consultation) return 4   // step 4 – wrap-up (incomplete)
  if (consultation) return 5                                        // all done
  return 2
}

/* ─── Progress Stepper ───────────────────────────────────────────────────── */

function ProgressStepper({ appointment, session, consultation }) {
  const activeIndex = resolveStepIndex(appointment, session, consultation)

  return (
    <div className="flex items-center gap-0 overflow-x-auto pt-1 pb-0.5">
      {STEPS.map((step, i) => {
        const done    = i < activeIndex
        const current = i === activeIndex
        const future  = i > activeIndex

        const circleClass = done
          ? 'bg-emerald-500 border-emerald-500 text-white'
          : current
            ? 'border-primary text-primary bg-white dark:bg-slate-900'
            : 'border-border text-muted-foreground bg-transparent dark:border-white/20'

        const labelClass = done
          ? 'text-emerald-600 dark:text-emerald-400'
          : current
            ? 'font-semibold'
            : 'text-muted-foreground opacity-60'

        return (
          <div key={step.id} className="flex items-center">
            {/* Step bubble */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${circleClass}`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <step.icon className="h-3.5 w-3.5" />
                )}
              </div>
              <span
                className={`whitespace-nowrap text-[10px] uppercase tracking-[0.14em] transition-all duration-300 ${labelClass}`}
                style={{ color: current ? 'hsl(var(--foreground))' : undefined }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 mb-5 h-px w-10 shrink-0 transition-all duration-500 sm:w-14 ${
                  done ? 'bg-emerald-400' : 'bg-border dark:bg-white/10'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Mini info chip ─────────────────────────────────────────────────────── */

function InfoChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: 'hsl(var(--card) / 0.7)' }}>
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
      <div>
        <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {label}
        </p>
        <p className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          {value}
        </p>
      </div>
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

  const patientName  = appointment.patientDisplay?.name || `Patient ${String(appointment.patientId || '').slice(0, 8).toUpperCase()}`
  const reason       = appointment.reasonForVisit || 'Consultation request'
  const scheduledAt  = formatDateTime(appointment.scheduledAt)
  const sessionStatus = session?.sessionStatus || null

  return (
    <div
      className="relative overflow-hidden rounded-[28px] border p-6"
      style={{
        borderColor: 'hsl(var(--border))',
        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.13) 0%, hsl(var(--accent) / 0.28) 60%, hsl(var(--background)) 100%)',
      }}
    >
      {/* Decorative circles */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-8 right-32 h-32 w-32 rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }}
      />

      <div className="relative space-y-5">
        {/* ── Top row: back + badges ── */}
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
            {consultation && <StatusBadge status="COMPLETED" />}
          </div>
        </div>

        {/* ── Patient + reason ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Consultation Workspace
            </p>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
              {patientName}
            </h2>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {reason}
            </p>
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <InfoChip icon={CalendarClock} label="Scheduled" value={scheduledAt} />
            {session && (
              <InfoChip
                icon={Video}
                label="Room"
                value={session.jitsiRoomId || 'Session created'}
              />
            )}
          </div>
        </div>

        {/* ── Progress stepper ── */}
        <div
          className="rounded-2xl border px-4 py-3"
          style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card) / 0.6)' }}
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Consultation Progress
          </p>
          <ProgressStepper
            appointment={appointment}
            session={session}
            consultation={consultation}
          />
        </div>
      </div>
    </div>
  )
}

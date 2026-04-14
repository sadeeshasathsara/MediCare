import { useMemo } from 'react'
import {
  Activity,
  AlertCircle,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  RefreshCcw,
  Video,
} from 'lucide-react'

import FeatureNotice from '@/features/telemedicine/components/FeatureNotice'
import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import { formatDateTime } from '@/features/telemedicine/services/telemedicineTypes'

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function shortId(id) {
  return String(id || '').slice(0, 8).toUpperCase()
}

function useCountdown(scheduledAt) {
  const ms = useMemo(() => {
    if (!scheduledAt) return null
    return new Date(scheduledAt).getTime() - Date.now()
  }, [scheduledAt])

  if (ms === null) return null
  if (ms < 0) return { label: 'Past due', urgent: true, overdue: true }
  const totalMins = Math.floor(ms / 60000)
  if (totalMins < 60) return { label: `in ${totalMins}m`, urgent: totalMins <= 15, overdue: false }
  const hrs = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  return { label: `in ${hrs}h ${mins}m`, urgent: false, overdue: false }
}

/* ─── Stat card ─────────────────────────────────────────────────────────────*/

function StatCard({ icon: Icon, label, value, accent, sublabel }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5"
      style={{
        borderColor: 'hsl(var(--border))',
        backgroundColor: 'hsl(var(--card))',
      }}
    >
      {/* coloured left accent bar */}
      <div className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${accent}`} />
      <div className="flex items-start justify-between">
        <div className="space-y-1 pl-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {label}
          </p>
          <p className="text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            {value}
          </p>
          {sublabel && (
            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{sublabel}</p>
          )}
        </div>
        <div className={`rounded-xl p-2.5 ${accent.replace('bg-', 'bg-').replace('-500', '-100')} dark:bg-white/10`}>
          <Icon className={`h-5 w-5 ${accent.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </div>
  )
}

/* ─── Countdown chip ────────────────────────────────────────────────────────*/

function CountdownChip({ scheduledAt }) {
  const countdown = useCountdown(scheduledAt)
  if (!countdown) return null

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        countdown.overdue
          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
          : countdown.urgent
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
            : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
      }`}
    >
      <Clock className="h-3 w-3" />
      {countdown.label}
    </span>
  )
}

/* ─── Pending action card ────────────────────────────────────────────────────*/

function PendingCard({ appointment, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(appointment.id)}
      className="group w-full rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50 hover:shadow-[0_4px_24px_-8px_rgba(245,158,11,0.4)] dark:border-amber-700/60 dark:bg-amber-950/20 dark:hover:border-amber-600"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
              Review Required
            </span>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[10px] text-amber-800 dark:bg-amber-800/30 dark:text-amber-300">
              #{shortId(appointment.id)}
            </span>
          </div>

          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {appointment.patientDisplay?.name || `Patient ${shortId(appointment.patientId)}`}
          </p>
          <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {appointment.reasonForVisit || 'Consultation request'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <CountdownChip scheduledAt={appointment.scheduledAt} />
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {formatDateTime(appointment.scheduledAt)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-amber-700 group-hover:gap-2 dark:text-amber-400 transition-all">
        Open to Review
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </button>
  )
}

/* ─── Upcoming session card ──────────────────────────────────────────────────*/

function UpcomingCard({ appointment, session, onSelect }) {
  const isLive = session?.sessionStatus === 'LIVE'
  const isWaiting = session?.sessionStatus === 'WAITING'

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment.id)}
      className={`group w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isLive
          ? 'border-red-300 bg-red-50/60 hover:border-red-400 dark:border-red-700/60 dark:bg-red-950/20'
          : isWaiting
            ? 'border-orange-300 bg-orange-50/60 hover:border-orange-400 dark:border-orange-700/60 dark:bg-orange-950/20'
            : 'hover:border-primary/30'
      }`}
      style={!isLive && !isWaiting ? { borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' } : {}}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {session ? (
              <StatusBadge status={session.sessionStatus} />
            ) : (
              <StatusBadge status={appointment.status} />
            )}
            <span className="rounded-md px-2 py-0.5 font-mono text-[10px]" style={{ backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--muted-foreground))' }}>
              #{shortId(appointment.id)}
            </span>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {appointment.patientDisplay?.name || `Patient ${shortId(appointment.patientId)}`}
          </p>
          <p className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <Video className="h-3 w-3" />
            {session
              ? `Session ${session.sessionStatus.toLowerCase()}`
              : 'Session not created yet'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {!isLive && <CountdownChip scheduledAt={appointment.scheduledAt} />}
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {formatDateTime(appointment.scheduledAt)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold group-hover:gap-2 transition-all" style={{ color: 'hsl(var(--primary))' }}>
        {isLive ? 'Join Session' : 'Open'}
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </button>
  )
}

/* ─── Rescheduled row ────────────────────────────────────────────────────────*/

function RescheduledRow({ appointment, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(appointment.id)}
      className="group flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
      style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <StatusBadge status="RESCHEDULED" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {appointment.patientDisplay?.name || `Patient ${shortId(appointment.patientId)}`}
          </p>
          <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {formatDateTime(appointment.scheduledAt)}
          </p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100 transition" style={{ color: 'hsl(var(--foreground))' }} />
    </button>
  )
}

/* ─── Section wrapper ────────────────────────────────────────────────────────*/

function DashSection({ title, icon: Icon, iconClass, count, children, emptyMessage, emptyIcon: EmptyIcon }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconClass}`} />
        <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          {title}
        </h3>
        {count !== undefined && (
          <span className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'hsl(var(--muted) / 0.5)', color: 'hsl(var(--muted-foreground))' }}>
            {count}
          </span>
        )}
      </div>
      {count === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border-dashed border px-4 py-3 text-sm" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
          {EmptyIcon && <EmptyIcon className="h-4 w-4 opacity-60" />}
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  )
}

/* ─── Loading skeleton ───────────────────────────────────────────────────────*/

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border p-5" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
            <div className="h-4 w-24 rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-3 h-8 w-12 rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border p-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
            <div className="h-4 w-28 rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-3 h-5 w-40 rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-3 h-4 w-full rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────────*/

export default function AppointmentInbox({
  appointments,
  sessionsByAppointmentId = {},
  loading,
  error,
  onRefreshAppointments,
  onSelectAppointment,
}) {
  const now = Date.now()

  const pending       = appointments.filter((a) => a.status === 'PENDING')
  const accepted      = appointments.filter((a) => a.status === 'ACCEPTED')
  const rescheduled   = appointments.filter((a) => a.status === 'RESCHEDULED')

  /* Live / waiting / upcoming from accepted */
  const liveNow = accepted.filter((a) => {
    const s = sessionsByAppointmentId[a.id]
    return s?.sessionStatus === 'LIVE'
  })

  const waitingNow = accepted.filter((a) => {
    const s = sessionsByAppointmentId[a.id]
    return s?.sessionStatus === 'WAITING'
  })

  const todaySessions = accepted.filter((a) => {
    if (!a.scheduledAt) return false
    const d = new Date(a.scheduledAt)
    const today = new Date()
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    )
  })

  const completedToday = accepted.filter((a) => {
    const s = sessionsByAppointmentId[a.id]
    if (s?.sessionStatus !== 'COMPLETED') return false
    if (!s.endedAt) return false
    const d = new Date(s.endedAt)
    const today = new Date()
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    )
  })

  /* Sort upcoming chronologically, live/waiting first */
  const upcomingSorted = [...accepted].sort((a, b) => {
    const sa = sessionsByAppointmentId[a.id]
    const sb = sessionsByAppointmentId[b.id]
    const isLiveA = sa?.sessionStatus === 'LIVE' || sa?.sessionStatus === 'WAITING'
    const isLiveB = sb?.sessionStatus === 'LIVE' || sb?.sessionStatus === 'WAITING'
    if (isLiveA && !isLiveB) return -1
    if (!isLiveA && isLiveB) return 1
    return new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0)
  })

  const stats = [
    {
      icon: CalendarClock,
      label: "Today's Sessions",
      value: loading ? '—' : todaySessions.length,
      accent: 'bg-indigo-500',
      sublabel: 'scheduled for today',
    },
    {
      icon: AlertCircle,
      label: 'Needs Review',
      value: loading ? '—' : pending.length,
      accent: 'bg-amber-500',
      sublabel: 'pending your decision',
    },
    {
      icon: Activity,
      label: 'Live Now',
      value: loading ? '—' : liveNow.length + waitingNow.length,
      accent: 'bg-red-500',
      sublabel: liveNow.length > 0 ? `${liveNow.length} in session` : 'no active sessions',
    },
    {
      icon: CheckCircle2,
      label: 'Completed Today',
      value: loading ? '—' : completedToday.length,
      accent: 'bg-emerald-500',
      sublabel: 'sessions wrapped up',
    },
  ]

  return (
    <section
      className="rounded-[28px] border p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)] backdrop-blur"
      style={{
        borderColor: 'hsl(var(--border))',
        backgroundColor: 'hsl(var(--card) / 0.97)',
      }}
    >
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'hsl(var(--primary) / 0.12)' }}>
              <CalendarCheck className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
              Telemedicine Dashboard
            </h2>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Your consultation command center — review requests, manage sessions, track readiness.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefreshAppointments}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
          style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error ? <FeatureNotice tone="error" title="Unable to load appointments" message={error} /> : null}

      {loading ? (
        <Skeleton />
      ) : (
        <div className="space-y-8">

          {/* ── Stat cards ── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          {/* ── Main grid ── */}
          <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">

            {/* LEFT: Action queue (pending + rescheduled) */}
            <div className="space-y-6">
              <DashSection
                title="Action Queue"
                icon={AlertCircle}
                iconClass="text-amber-500"
                count={pending.length}
                emptyMessage="No pending requests — you're all caught up."
                emptyIcon={CheckCircle2}
              >
                <div className="space-y-3">
                  {pending.map((a) => (
                    <PendingCard
                      key={a.id}
                      appointment={a}
                      onSelect={onSelectAppointment}
                    />
                  ))}
                </div>
              </DashSection>

              <DashSection
                title="Rescheduled Follow-ups"
                icon={CalendarClock}
                iconClass="text-sky-500"
                count={rescheduled.length}
                emptyMessage="No rescheduled appointments."
                emptyIcon={CalendarCheck}
              >
                <div className="space-y-2">
                  {rescheduled.map((a) => (
                    <RescheduledRow
                      key={a.id}
                      appointment={a}
                      onSelect={onSelectAppointment}
                    />
                  ))}
                </div>
              </DashSection>
            </div>

            {/* RIGHT: Upcoming sessions */}
            <DashSection
              title="Upcoming & Active Sessions"
              icon={Video}
              iconClass="text-primary"
              count={accepted.length}
              emptyMessage="No accepted appointments yet. Accept a request from the Action Queue to get started."
              emptyIcon={CalendarClock}
            >
              <div className="space-y-3">
                {upcomingSorted.map((a) => (
                  <UpcomingCard
                    key={a.id}
                    appointment={a}
                    session={sessionsByAppointmentId[a.id] || null}
                    onSelect={onSelectAppointment}
                  />
                ))}
              </div>
            </DashSection>

          </div>
        </div>
      )}
    </section>
  )
}

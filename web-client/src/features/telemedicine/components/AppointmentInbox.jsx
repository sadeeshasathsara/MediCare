import {
  RefreshCcw,
  Video,
} from 'lucide-react'

import FeatureNotice from '@/features/telemedicine/components/FeatureNotice'
import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import TelemedicineSection from '@/features/telemedicine/components/TelemedicineSection'
import { formatDateTime } from '@/features/telemedicine/services/telemedicineTypes'

const BOARD_COLUMNS = [
  {
    status: 'PENDING',
    title: 'Pending Review',
    description: 'New telemedicine requests waiting for your decision.',
    emptyMessage: 'No pending requests right now.',
  },
  {
    status: 'ACCEPTED',
    title: 'Accepted',
    description: 'Confirmed appointments ready for session setup or live consultation.',
    emptyMessage: 'No accepted appointments yet.',
  },
  {
    status: 'RESCHEDULED',
    title: 'Rescheduled',
    description: 'Appointments with a proposed new time that still need follow-through.',
    emptyMessage: 'No rescheduled appointments waiting.',
  },
]

function actionButtonClass() {
  return 'inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.05]'
}

function summarizeNotes(notes) {
  const normalized = String(notes || '').trim()
  if (!normalized) return 'No additional notes were provided for this request.'
  if (normalized.length <= 120) return normalized
  return `${normalized.slice(0, 117)}...`
}

function AppointmentBoardCard({ appointment, session, onSelect }) {
  const sessionLabel = session
    ? `Session ${session.sessionStatus.toLowerCase()}`
    : appointment.status === 'ACCEPTED'
      ? 'Session not created yet'
      : 'No session activity yet'

  return (
    <button
      type="button"
      onClick={() => onSelect(appointment.id)}
      className="w-full rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5"
      style={{
        borderColor: 'hsl(var(--border))',
        backgroundColor: 'hsl(var(--card))',
      }}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={appointment.status} />
              <span className="text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {appointment.id}
              </span>
            </div>
            <p className="text-base font-semibold leading-6" style={{ color: 'hsl(var(--foreground))' }}>
              {appointment.patientDisplay?.name || `Patient ${appointment.patientId}`}
            </p>
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {appointment.patientDisplay?.userId || appointment.patientId}
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

        <div className="space-y-2">
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {appointment.reasonForVisit || 'Consultation request'}
          </p>
          <p className="text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {summarizeNotes(appointment.notes)}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-2" style={{ backgroundColor: 'hsl(var(--background) / 0.75)', color: 'hsl(var(--muted-foreground))' }}>
            <Video className="h-4 w-4" />
            <span>{sessionLabel}</span>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
            Open details
          </span>
        </div>
      </div>
    </button>
  )
}

export default function AppointmentInbox({
  appointments,
  sessionsByAppointmentId = {},
  loading,
  error,
  onRefreshAppointments,
  onSelectAppointment,
}) {
  const rejectedCount = appointments.filter((appointment) => appointment.status === 'REJECTED').length

  return (
    <TelemedicineSection
      title="My Appointments"
      description="Appointments assigned to the logged-in doctor. Open any pending, accepted, or rescheduled appointment to continue into its full teleconsultation page."
      actions={(
        <button
          type="button"
          onClick={onRefreshAppointments}
          className={actionButtonClass()}
          style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </button>
      )}
    >
      <div className="space-y-5">
        {error ? <FeatureNotice tone="error" title="Unable to load appointments" message={error} /> : null}

        <div className="grid gap-4 lg:grid-cols-3">
          {BOARD_COLUMNS.map((column) => {
            const count = appointments.filter((appointment) => appointment.status === column.status).length
            return (
              <div
                key={column.status}
                className="rounded-[24px] border px-5 py-4"
                style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.55)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {column.title}
                    </p>
                    <p className="mt-2 text-2xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {count}
                    </p>
                  </div>
                  <StatusBadge status={column.status} className="opacity-85" />
                </div>
                <p className="mt-3 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {column.description}
                </p>
              </div>
            )
          })}
        </div>

        {rejectedCount > 0 ? (
          <FeatureNotice
            tone="info"
            title="Rejected appointments are kept out of the active board"
            message={`${rejectedCount} rejected appointment${rejectedCount === 1 ? '' : 's'} remain archived in the backend, but the main doctor board stays focused on pending, accepted, and rescheduled work.`}
          />
        ) : null}

        <div className="grid gap-5 xl:grid-cols-3">
          {BOARD_COLUMNS.map((column) => {
            const columnAppointments = appointments.filter((appointment) => appointment.status === column.status)
            const shouldScrollCards = !loading && columnAppointments.length > 3

            return (
              <div
                key={column.status}
                className="rounded-[26px] border p-4"
                style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.5)' }}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {column.title}
                    </p>
                    <p className="text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {column.description}
                    </p>
                  </div>
                  <div className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]" style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))' }}>
                    {columnAppointments.length}
                  </div>
                </div>

                <div className={shouldScrollCards ? 'max-h-[46rem] space-y-3 overflow-y-auto pr-1' : 'space-y-3'}>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`${column.status}-${index}`}
                        className="animate-pulse rounded-[22px] border p-4"
                        style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                      >
                        <div className="h-4 w-28 rounded bg-black/10 dark:bg-white/10" />
                        <div className="mt-3 h-5 w-40 rounded bg-black/10 dark:bg-white/10" />
                        <div className="mt-3 h-4 w-full rounded bg-black/10 dark:bg-white/10" />
                      </div>
                    ))
                  ) : null}

                  {!loading && columnAppointments.length === 0 ? (
                    <FeatureNotice tone="info" title={column.title} message={column.emptyMessage} />
                  ) : null}

                  {!loading
                    ? columnAppointments.map((appointment) => (
                        <AppointmentBoardCard
                          key={appointment.id}
                          appointment={appointment}
                          session={sessionsByAppointmentId[appointment.id] || null}
                          onSelect={onSelectAppointment}
                        />
                      ))
                    : null}
                </div>
              </div>
            )
          })}
        </div>

       
      </div>
    </TelemedicineSection>
  )
}

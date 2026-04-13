import { useState } from 'react'
import { CalendarClock, FileText, RefreshCcw } from 'lucide-react'

import FeatureNotice from '@/features/telemedicine/components/FeatureNotice'
import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import TelemedicineSection from '@/features/telemedicine/components/TelemedicineSection'
import {
  APPOINTMENT_STATUSES,
  formatDateTime,
  humanizeStatus,
  nextLocalDateTimeValue,
  toDateTimeLocalValue,
} from '@/features/telemedicine/services/telemedicineTypes'

const FILTER_OPTIONS = ['ALL', ...APPOINTMENT_STATUSES]

function actionButtonClass(kind = 'secondary') {
  if (kind === 'primary') {
    return 'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60'
  }

  if (kind === 'danger') {
    return 'inline-flex items-center justify-center rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100'
  }

  return 'inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.05]'
}

function AppointmentDetailsPanel({
  selectedAppointment,
  actionState,
  onAcceptAppointment,
  onRejectAppointment,
  onRescheduleAppointment,
}) {
  const [rejectReason, setRejectReason] = useState(selectedAppointment.rejectionReason || '')
  const [rescheduleReason, setRescheduleReason] = useState(selectedAppointment.rescheduleReason || '')
  const [rescheduleAt, setRescheduleAt] = useState(
    toDateTimeLocalValue(
      selectedAppointment.proposedScheduledAt || selectedAppointment.scheduledAt
    ) || nextLocalDateTimeValue(45)
  )

  const acceptDisabled = selectedAppointment.status === 'ACCEPTED' || actionState.loading
  const rejectDisabled = actionState.loading
  const rescheduleDisabled = actionState.loading

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={selectedAppointment.status} />
            <span className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {selectedAppointment.id}
            </span>
          </div>
          <h3 className="text-xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
            {selectedAppointment.reasonForVisit || 'Consultation request'}
          </h3>
        </div>
        <div className="rounded-[22px] border px-4 py-3 text-right" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.7)' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Next slot
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {formatDateTime(selectedAppointment.scheduledAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.6)' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Patient ID
          </p>
          <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {selectedAppointment.patientId}
          </p>
        </div>
        <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.6)' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Current status
          </p>
          <div className="mt-2">
            <StatusBadge status={selectedAppointment.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.55)' }}>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Appointment notes
            </p>
          </div>
          <p className="mt-3 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {selectedAppointment.notes || 'No additional notes were provided for this request.'}
          </p>
        </div>

        <div className="rounded-[24px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.55)' }}>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Decision summary
            </p>
          </div>
          <div className="mt-3 space-y-2 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {selectedAppointment.rejectionReason ? <p>Rejection reason: {selectedAppointment.rejectionReason}</p> : null}
            {selectedAppointment.rescheduleReason ? <p>Reschedule reason: {selectedAppointment.rescheduleReason}</p> : null}
            {selectedAppointment.proposedScheduledAt ? <p>Proposed time: {formatDateTime(selectedAppointment.proposedScheduledAt)}</p> : null}
            {!selectedAppointment.rejectionReason && !selectedAppointment.rescheduleReason ? (
              <p>No decision notes saved yet.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={acceptDisabled}
            onClick={() => onAcceptAppointment(selectedAppointment.id)}
            className={actionButtonClass('primary')}
            style={{ backgroundColor: 'hsl(var(--primary))' }}
          >
            {actionState.loading && actionState.kind === 'accept' ? 'Accepting...' : 'Accept Appointment'}
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <form
            className="space-y-3 rounded-[24px] border p-4"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.55)' }}
            onSubmit={(event) => {
              event.preventDefault()
              onRejectAppointment(selectedAppointment.id, rejectReason)
            }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                Reject request
              </p>
              <p className="mt-1 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Provide a short reason so the patient can be informed clearly.
              </p>
            </div>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              placeholder="Example: Please upload recent lab results before the consultation."
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
              style={{
                borderColor: 'hsl(var(--border))',
                backgroundColor: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
              }}
            />
            <button type="submit" disabled={rejectDisabled || !rejectReason.trim()} className={actionButtonClass('danger')}>
              {actionState.loading && actionState.kind === 'reject' ? 'Rejecting...' : 'Reject Appointment'}
            </button>
          </form>

          <form
            className="space-y-3 rounded-[24px] border p-4"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.55)' }}
            onSubmit={(event) => {
              event.preventDefault()
              onRescheduleAppointment(selectedAppointment.id, {
                newScheduledAt: rescheduleAt,
                reason: rescheduleReason,
              })
            }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                Propose a new time
              </p>
              <p className="mt-1 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Update the appointment time and save the reason for the change.
              </p>
            </div>
            <input
              type="datetime-local"
              value={rescheduleAt}
              onChange={(event) => setRescheduleAt(event.target.value)}
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
              style={{
                borderColor: 'hsl(var(--border))',
                backgroundColor: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
              }}
            />
            <textarea
              value={rescheduleReason}
              onChange={(event) => setRescheduleReason(event.target.value)}
              rows={3}
              placeholder="Example: Need to shift this follow-up to the afternoon clinic window."
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
              style={{
                borderColor: 'hsl(var(--border))',
                backgroundColor: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
              }}
            />
            <button
              type="submit"
              disabled={rescheduleDisabled || !rescheduleAt || !rescheduleReason.trim()}
              className={actionButtonClass()}
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            >
              {actionState.loading && actionState.kind === 'reschedule' ? 'Saving...' : 'Reschedule Appointment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AppointmentInbox({
  appointments,
  selectedAppointment,
  loading,
  error,
  actionState,
  onRefreshAppointments,
  onSelectAppointment,
  onAcceptAppointment,
  onRejectAppointment,
  onRescheduleAppointment,
}) {
  const [activeFilter, setActiveFilter] = useState('ALL')

  const appointmentCounts = appointments.reduce(
    (counts, appointment) => ({
      ...counts,
      [appointment.status]: (counts[appointment.status] || 0) + 1,
    }),
    {}
  )

  const filteredAppointments =
    activeFilter === 'ALL'
      ? appointments
      : appointments.filter((appointment) => appointment.status === activeFilter)

  const detailPanelKey = selectedAppointment
    ? [
        selectedAppointment.id,
        selectedAppointment.status,
        selectedAppointment.rejectionReason || '',
        selectedAppointment.rescheduleReason || '',
        selectedAppointment.proposedScheduledAt || '',
        selectedAppointment.scheduledAt || '',
      ].join('|')
    : 'empty'

  return (
    <TelemedicineSection
      title="Appointment Inbox"
      description="Review consultation requests, confirm the schedule, and keep the session lifecycle moving from one place."
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
        {actionState.error ? <FeatureNotice tone="error" title="Appointment action failed" message={actionState.error} /> : null}
        {actionState.success ? <FeatureNotice tone="success" title="Appointment updated" message={actionState.success} /> : null}

        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((filterOption) => {
            const isActive = filterOption === activeFilter
            const count = filterOption === 'ALL' ? appointments.length : appointmentCounts[filterOption] || 0

            return (
              <button
                key={filterOption}
                type="button"
                onClick={() => setActiveFilter(filterOption)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  isActive ? 'border-transparent text-white shadow-lg shadow-cyan-500/20' : ''
                }`}
                style={
                  isActive
                    ? { backgroundColor: 'hsl(var(--primary))' }
                    : {
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--muted-foreground))',
                        backgroundColor: 'hsl(var(--card))',
                      }
                }
              >
                {humanizeStatus(filterOption)} ({count})
              </button>
            )
          })}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_1.25fr]">
          <div
            className="rounded-[24px] border p-3"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.55)' }}
          >
            <div className="max-h-[38rem] space-y-3 overflow-y-auto pr-1">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="animate-pulse rounded-[22px] border p-4"
                      style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                    >
                      <div className="h-4 w-28 rounded bg-black/10 dark:bg-white/10" />
                      <div className="mt-3 h-6 w-44 rounded bg-black/10 dark:bg-white/10" />
                      <div className="mt-3 h-4 w-56 rounded bg-black/10 dark:bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : null}

              {!loading && filteredAppointments.length === 0 ? (
                <FeatureNotice
                  tone="info"
                  title="No appointments in this filter"
                  message="Use the manual test tools below to seed a demo appointment if the backend has no telemedicine records yet."
                />
              ) : null}

              {!loading
                ? filteredAppointments.map((appointment) => {
                    const isSelected = appointment.id === selectedAppointment?.id

                    return (
                      <button
                        key={appointment.id}
                        type="button"
                        onClick={() => onSelectAppointment(appointment.id)}
                        className={`w-full rounded-[22px] border p-4 text-left transition ${
                          isSelected ? 'shadow-[0_20px_60px_-40px_rgba(6,182,212,0.7)]' : 'hover:-translate-y-0.5'
                        }`}
                        style={{
                          borderColor: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                          backgroundColor: isSelected ? 'hsl(var(--accent))' : 'hsl(var(--card))',
                        }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={appointment.status} />
                              <span className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                {appointment.id}
                              </span>
                            </div>
                            <p className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                              {appointment.reasonForVisit || 'Consultation request'}
                            </p>
                            <p className="text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                              Patient {appointment.patientId}
                            </p>
                          </div>
                          <div className="rounded-2xl px-3 py-2 text-right" style={{ backgroundColor: 'hsl(var(--background) / 0.7)' }}>
                            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                              Scheduled
                            </p>
                            <p className="mt-1 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                              {formatDateTime(appointment.scheduledAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })
                : null}
            </div>
          </div>

          <div
            className="rounded-[24px] border p-5"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
          >
            {!selectedAppointment ? (
              <FeatureNotice
                tone="info"
                title="Select an appointment"
                message="Choose any request from the inbox to review the details and prepare the teleconsultation."
              />
            ) : (
              <AppointmentDetailsPanel
                key={detailPanelKey}
                selectedAppointment={selectedAppointment}
                actionState={actionState}
                onAcceptAppointment={onAcceptAppointment}
                onRejectAppointment={onRejectAppointment}
                onRescheduleAppointment={onRescheduleAppointment}
              />
            )}
          </div>
        </div>
      </div>
    </TelemedicineSection>
  )
}

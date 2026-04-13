import { useState } from 'react'
import { CalendarClock, FileText } from 'lucide-react'

import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import {
  formatDateTime,
  nextLocalDateTimeValue,
  toDateTimeLocalValue,
} from '@/features/telemedicine/services/telemedicineTypes'

function actionButtonClass(kind = 'secondary') {
  if (kind === 'primary') {
    return 'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60'
  }

  if (kind === 'danger') {
    return 'inline-flex items-center justify-center rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100'
  }

  return 'inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.05]'
}

export default function AppointmentDetailsPanel({
  selectedAppointment,
  doctorDisplay,
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
            Scheduled for
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {formatDateTime(selectedAppointment.scheduledAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.6)' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Patient
          </p>
          <div className="mt-2 space-y-1 text-sm" style={{ color: 'hsl(var(--foreground))' }}>
            <p className="font-semibold">
              {selectedAppointment.patientDisplay?.name || selectedAppointment.patientId}
            </p>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>
              {selectedAppointment.patientDisplay?.email || 'No patient email available'}
            </p>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>
              DOB: {selectedAppointment.patientDisplay?.dob || 'Not available'}
            </p>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>
              Status: {selectedAppointment.patientDisplay?.status || 'Unknown'}
            </p>
            <p className="break-all text-xs uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {selectedAppointment.patientDisplay?.userId || selectedAppointment.patientId}
            </p>
          </div>
        </div>

        <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.6)' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Doctor
          </p>
          <div className="mt-2 space-y-1 text-sm" style={{ color: 'hsl(var(--foreground))' }}>
            <p className="font-semibold">{doctorDisplay?.name || 'Doctor'}</p>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>
              {doctorDisplay?.email || 'No doctor email available'}
            </p>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>
              Verification: {doctorDisplay?.doctorVerified ? 'Verified' : 'Not verified'}
            </p>
            <p className="break-all text-xs uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {doctorDisplay?.id || selectedAppointment.doctorId}
            </p>
          </div>
        </div>

        <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.6)' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Decision status
          </p>
          <div className="mt-2">
            <StatusBadge status={selectedAppointment.status} />
          </div>
          <p className="mt-3 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Accept to unlock session creation, reject with a clear reason, or propose a new time that fits your schedule.
          </p>
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

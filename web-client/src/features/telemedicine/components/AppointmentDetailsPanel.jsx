import { createElement, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarClock, CheckCircle, FileText, X, XCircle } from 'lucide-react'

import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import {
  formatDateTime,
  nextLocalDateTimeValue,
  toDateTimeLocalValue,
} from '@/features/telemedicine/services/telemedicineTypes'

/* ─── Modal backdrop ─────────────────────────────────────────────────────── */

function Modal({ open, onClose, title, children }) {
  const overlayRef = useRef(null)

  /* Close on Escape */
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-3xl border p-6 shadow-2xl"
        style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-black/6 dark:hover:bg-white/8"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

/* ─── Info grid cell ─────────────────────────────────────────────────────── */

function InfoCell({ icon, label, value }) {
  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.55)' }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {createElement(icon, { className: 'h-3.5 w-3.5', style: { color: 'hsl(var(--primary))' } })}
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {label}
        </p>
      </div>
      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
        {value || '—'}
      </p>
    </div>
  )
}

/* ─── Shared input styles ────────────────────────────────────────────────── */

const inputClass = 'w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/30'
const inputStyle = {
  borderColor: 'hsl(var(--border))',
  backgroundColor: 'hsl(var(--background))',
  color: 'hsl(var(--foreground))',
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function AppointmentDetailsPanel({
  selectedAppointment,
  actionState,
  onAcceptAppointment,
  onRejectAppointment,
  onRescheduleAppointment,
}) {
  const [rejectOpen,     setRejectOpen]     = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)

  const [rejectReason,    setRejectReason]    = useState(selectedAppointment.rejectionReason || '')
  const [rescheduleReason, setRescheduleReason] = useState(selectedAppointment.rescheduleReason || '')
  const [rescheduleAt,    setRescheduleAt]    = useState(
    toDateTimeLocalValue(selectedAppointment.proposedScheduledAt || selectedAppointment.scheduledAt)
    || nextLocalDateTimeValue(45)
  )

  const acceptDisabled     = selectedAppointment.status === 'ACCEPTED' || actionState.loading
  const rejectDisabled     = actionState.loading || !rejectReason.trim()
  const rescheduleDisabled = actionState.loading || !rescheduleAt || !rescheduleReason.trim()

  const handleRejectSubmit = (e) => {
    e.preventDefault()
    onRejectAppointment(selectedAppointment.id, rejectReason)
    setRejectOpen(false)
  }

  const handleRescheduleSubmit = (e) => {
    e.preventDefault()
    onRescheduleAppointment(selectedAppointment.id, {
      newScheduledAt: rescheduleAt,
      reason: rescheduleReason,
    })
    setRescheduleOpen(false)
  }

  return (
    <>
      <div className="space-y-5">

        {/* ── Appointment info grid ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCell
            icon={CalendarClock}
            label="Scheduled for"
            value={formatDateTime(selectedAppointment.scheduledAt)}
          />
          <InfoCell
            icon={FileText}
            label="Reason"
            value={selectedAppointment.reasonForVisit || 'Consultation request'}
          />
          <div
            className="rounded-2xl border px-4 py-3"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.55)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Status
            </p>
            <StatusBadge status={selectedAppointment.status} />
          </div>
        </div>

        {/* Appointment notes */}
        {selectedAppointment.notes && (
          <div
            className="rounded-2xl border px-4 py-4"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.5)' }}
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Patient notes
            </p>
            <p className="text-sm leading-6" style={{ color: 'hsl(var(--foreground))' }}>
              {selectedAppointment.notes}
            </p>
          </div>
        )}

        {/* Previous decision info — shown read-only if exists */}
        {(selectedAppointment.rejectionReason || selectedAppointment.rescheduleReason) && (
          <div
            className="rounded-2xl border px-4 py-4"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.5)' }}
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Previous decision
            </p>
            {selectedAppointment.rejectionReason && (
              <p className="text-sm leading-6" style={{ color: 'hsl(var(--foreground))' }}>
                <span className="font-semibold text-rose-600 dark:text-rose-400">Rejected: </span>
                {selectedAppointment.rejectionReason}
              </p>
            )}
            {selectedAppointment.rescheduleReason && (
              <p className="text-sm leading-6" style={{ color: 'hsl(var(--foreground))' }}>
                <span className="font-semibold text-sky-600 dark:text-sky-400">Rescheduled: </span>
                {selectedAppointment.rescheduleReason}
                {selectedAppointment.proposedScheduledAt && (
                  <span className="ml-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    → {formatDateTime(selectedAppointment.proposedScheduledAt)}
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Accept */}
          <button
            type="button"
            disabled={acceptDisabled}
            onClick={() => onAcceptAppointment(selectedAppointment.id)}
            className="tm-btn-tone tm-btn-success inline-flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {actionState.loading && actionState.kind === 'accept' ? 'Accepting…' : 'Accept'}
          </button>

          {/* Reject */}
          <button
            type="button"
            disabled={actionState.loading}
            onClick={() => setRejectOpen(true)}
            className="tm-btn-tone tm-btn-danger inline-flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            {actionState.loading && actionState.kind === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>

          {/* Reschedule */}
          <button
            type="button"
            disabled={actionState.loading}
            onClick={() => setRescheduleOpen(true)}
            className="tm-btn-tone tm-btn-info inline-flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CalendarClock className="h-4 w-4" />
            {actionState.loading && actionState.kind === 'reschedule' ? 'Saving…' : 'Reschedule'}
          </button>
        </div>
      </div>

      {/* ── Reject modal ── */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Appointment"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Provide a short reason so the patient knows why the appointment was declined.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="e.g. Please upload recent lab results before the consultation."
            className={inputClass}
            style={inputStyle}
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              className="tm-btn-tone tm-btn-neutral rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rejectDisabled}
              className="tm-btn-tone tm-btn-solid-danger inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Reschedule modal ── */}
      <Modal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title="Propose a New Time"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Choose a new date and time, then provide a brief reason for the change.
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              New date &amp; time
            </label>
            <input
              type="datetime-local"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Reason
            </label>
            <textarea
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              rows={3}
              placeholder="e.g. Need to shift this to the afternoon clinic window."
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRescheduleOpen(false)}
              className="tm-btn-tone tm-btn-neutral rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rescheduleDisabled}
              className="tm-btn-tone tm-btn-solid-info inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CalendarClock className="h-4 w-4" />
              Confirm Reschedule
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

import { useState } from 'react'
import { FlaskConical, Sparkles, UserRoundPlus } from 'lucide-react'

import FeatureNotice from '@/features/telemedicine/components/FeatureNotice'
import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import TelemedicineSection from '@/features/telemedicine/components/TelemedicineSection'
import {
  formatDateTime,
  nextLocalDateTimeValue,
} from '@/features/telemedicine/services/telemedicineTypes'

function actionButtonClass(kind = 'secondary') {
  if (kind === 'primary') {
    return 'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60'
  }

  return 'inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.05]'
}

export default function ManualTestToolsPanel({
  doctorId,
  selectedSession,
  actionState,
  onSeedDemoAppointment,
  onQuickDemo,
  onOpenPatientTestWindow,
}) {
  const [patientId, setPatientId] = useState('patient-demo-001')
  const [scheduledAt, setScheduledAt] = useState(nextLocalDateTimeValue(60))
  const [reasonForVisit, setReasonForVisit] = useState('Follow-up teleconsultation')
  const [notes, setNotes] = useState('Temporary test appointment created from the telemedicine workspace.')

  return (
    <TelemedicineSection
      title="Manual Test Tools"
      description="Temporary dev support to exercise the telemedicine flow end-to-end without waiting for the other team's appointment UI."
    >
      <div className="space-y-5">
        <FeatureNotice
          tone="warning"
          title="Temporary telemedicine-only helpers"
          message="These controls exist only to manually validate your telemedicine flow. They stay inside this feature and do not modify other frontend areas."
        />

        {actionState.error ? <FeatureNotice tone="error" title="Manual test action failed" message={actionState.error} /> : null}
        {actionState.success ? <FeatureNotice tone="success" title="Manual test action completed" message={actionState.success} /> : null}

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <form
            className="space-y-4 rounded-[24px] border p-5"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
            onSubmit={(event) => {
              event.preventDefault()
              onSeedDemoAppointment({
                patientId,
                scheduledAt,
                reasonForVisit,
                notes,
              })
            }}
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                Seed demo appointment
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                  Doctor ID
                </label>
                <input
                  type="text"
                  value={doctorId || ''}
                  readOnly
                  className="w-full rounded-2xl border px-4 py-3 text-sm"
                  style={{
                    borderColor: 'hsl(var(--border))',
                    backgroundColor: 'hsl(var(--background) / 0.55)',
                    color: 'hsl(var(--muted-foreground))',
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                  Patient ID
                </label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                  style={{
                    borderColor: 'hsl(var(--border))',
                    backgroundColor: 'hsl(var(--background) / 0.55)',
                    color: 'hsl(var(--foreground))',
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                Scheduled at
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{
                  borderColor: 'hsl(var(--border))',
                  backgroundColor: 'hsl(var(--background) / 0.55)',
                  color: 'hsl(var(--foreground))',
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                Reason for visit
              </label>
              <input
                type="text"
                value={reasonForVisit}
                onChange={(event) => setReasonForVisit(event.target.value)}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{
                  borderColor: 'hsl(var(--border))',
                  backgroundColor: 'hsl(var(--background) / 0.55)',
                  color: 'hsl(var(--foreground))',
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{
                  borderColor: 'hsl(var(--border))',
                  backgroundColor: 'hsl(var(--background) / 0.55)',
                  color: 'hsl(var(--foreground))',
                }}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={actionState.loading}
                className={actionButtonClass('primary')}
                style={{ backgroundColor: 'hsl(var(--primary))' }}
              >
                {actionState.loading && actionState.kind === 'seed' ? 'Seeding...' : 'Seed Demo Appointment'}
              </button>

              <button
                type="button"
                onClick={() =>
                  onQuickDemo({
                    patientId,
                    scheduledAt,
                    reasonForVisit,
                    notes,
                  })
                }
                disabled={actionState.loading}
                className={actionButtonClass()}
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {actionState.loading && actionState.kind === 'quick-demo' ? 'Preparing...' : 'Quick Demo'}
              </button>
            </div>
          </form>

          <div className="space-y-4 rounded-[24px] border p-5" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
            <div className="flex items-center gap-2">
              <UserRoundPlus className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                Patient-side manual join
              </p>
            </div>

            {!selectedSession ? (
              <FeatureNotice
                tone="info"
                title="No active session selected"
                message="Select or create a session first. Then this button will open a temporary patient-side Jitsi window for manual two-party testing."
              />
            ) : (
              <>
                <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.55)' }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedSession.sessionStatus} />
                    <span className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {selectedSession.id}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                    {selectedSession.jitsiRoomId}
                  </p>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Scheduled {formatDateTime(selectedSession.scheduledAt)}
                  </p>
                </div>

                <FeatureNotice
                  tone="info"
                  title="Popup note"
                  message="The browser may block popups unless this action is triggered directly by a click. The page opens a temporary patient test window using a fresh patient JWT."
                />

                <button
                  type="button"
                  onClick={onOpenPatientTestWindow}
                  disabled={actionState.loading}
                  className={actionButtonClass('primary')}
                  style={{ backgroundColor: 'hsl(var(--primary))' }}
                >
                  {actionState.loading && actionState.kind === 'patient-window'
                    ? 'Opening patient window...'
                    : 'Open Patient Test Window'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </TelemedicineSection>
  )
}


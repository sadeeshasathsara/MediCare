import { UserRoundPlus } from 'lucide-react'

import FeatureNotice from '@/features/telemedicine/components/FeatureNotice'
import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import TelemedicineSection from '@/features/telemedicine/components/TelemedicineSection'
import { formatDateTime } from '@/features/telemedicine/services/telemedicineTypes'

function actionButtonClass(kind = 'secondary') {
  if (kind === 'primary') {
    return 'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60'
  }

  return 'inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.05]'
}

export default function ManualTestToolsPanel({
  doctorDisplay,
  selectedSession,
  actionState,
  onOpenPatientTestWindow,
}) {
  return (
    <TelemedicineSection
      title="Manual Test Tools"
      description="Appointment creation is now owned by Appointment Service. Use this section for patient-side join simulation only."
    >
      <div className="space-y-5">
        <div className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.55)' }}>
          <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Logged doctor reference: <span style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>{doctorDisplay?.id || 'Unknown doctor'}</span>
          </p>
        </div>

        {actionState.error ? <FeatureNotice tone="error" title="Manual test action failed" message={actionState.error} /> : null}
        {actionState.success ? <FeatureNotice tone="success" title="Manual test action completed" message={actionState.success} /> : null}

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
                message="The browser may block popups unless this action is triggered directly by a click. The page opens a temporary patient test window using fresh patient join access."
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
    </TelemedicineSection>
  )
}

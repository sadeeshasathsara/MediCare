import { Activity, Clock3, PlayCircle, Radio, RefreshCcw, Video } from 'lucide-react'

import FeatureNotice from '@/features/telemedicine/components/FeatureNotice'
import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import TelemedicineSection from '@/features/telemedicine/components/TelemedicineSection'
import {
  formatDateTime,
  formatDuration,
  getSessionStateCopy,
} from '@/features/telemedicine/services/telemedicineTypes'

function actionButtonClass(kind = 'secondary') {
  if (kind === 'primary') {
    return 'tm-btn-tone tm-btn-primary inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60'
  }

  if (kind === 'success') {
    return 'tm-btn-tone tm-btn-success inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60'
  }

  if (kind === 'danger') {
    return 'tm-btn-tone tm-btn-danger inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60'
  }

  return 'tm-btn-tone tm-btn-neutral inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60'
}

export default function SessionControlPanel({
  appointment,
  session,
  readiness,
  joinInfo,
  loading,
  error,
  actionState,
  onRefreshSession,
  onCreateSession,
  onGenerateDoctorJoin,
  onStartSession,
  onEndSession,
}) {
  const createSessionDisabled = !appointment || appointment.status !== 'ACCEPTED' || Boolean(session) || actionState.loading
  const startDisabled = !session || !['SCHEDULED', 'WAITING'].includes(session.sessionStatus) || actionState.loading
  const endDisabled = !session || session.sessionStatus !== 'LIVE' || actionState.loading
  const joinDisabled = !session || ['CANCELLED', 'MISSED'].includes(session.sessionStatus) || actionState.loading
  const sessionStateCopy = session ? getSessionStateCopy(session.sessionStatus) : 'Accept an appointment to create the teleconsultation room.'

  return (
    <TelemedicineSection
      title="Session Control"
      description="Create the Jitsi session, monitor readiness, and drive the room from waiting to live and completed."
      actions={(
        <button
          type="button"
          onClick={onRefreshSession}
          disabled={!appointment || loading}
          className={actionButtonClass()}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh Session
        </button>
      )}
    >
      <div className="space-y-5">
        {error ? <FeatureNotice tone="error" title="Session lookup failed" message={error} /> : null}
        {actionState.error ? <FeatureNotice tone="error" title="Session action failed" message={actionState.error} /> : null}
        {actionState.success ? <FeatureNotice tone="success" title="Session updated" message={actionState.success} /> : null}

        {!appointment ? (
          <FeatureNotice
            tone="info"
            title="Select an appointment"
            message="The teleconsultation session controls unlock when an appointment is selected from the inbox."
          />
        ) : null}

        {appointment ? (
          <div className="space-y-4">
            <div
              className="rounded-[28px] border p-5"
              style={{
                borderColor: 'hsl(var(--border))',
                background:
                  'linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--accent) / 0.45))',
              }}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {session ? <StatusBadge status={session.sessionStatus} /> : <StatusBadge status="SCHEDULED" className="opacity-70" />}
                    <span className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {session ? session.id : 'No session yet'}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                    {session ? session.jitsiRoomId : 'Session not created yet'}
                  </h3>
                  <p className="max-w-2xl text-sm leading-6" style={{ color: 'hsl(var(--foreground))' }}>
                    {sessionStateCopy}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card) / 0.7)' }}>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Scheduled time
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {session ? formatDateTime(session.scheduledAt) : formatDateTime(appointment.scheduledAt)}
                    </p>
                  </div>
                  <div className="rounded-3xl border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card) / 0.7)' }}>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Session duration
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {session ? formatDuration(session.durationSeconds) : 'Not started'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4 rounded-3xl border p-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                    Controls
                  </p>
                </div>

                {/* ── Phase 1: no session yet — show only Create Session ── */}
                {!session && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      disabled={createSessionDisabled}
                      onClick={onCreateSession}
                      className={actionButtonClass('primary')}
                    >
                      {actionState.loading && actionState.kind === 'create' ? 'Creating...' : 'Create Session'}
                    </button>

                    {appointment.status !== 'ACCEPTED' ? (
                      <FeatureNotice
                        tone="warning"
                        title="Session creation is locked"
                        message="Only accepted appointments can create a teleconsultation session."
                      />
                    ) : null}
                  </div>
                )}

                {/* ── Phase 2: session exists — show join + start/end ── */}
                {session && (
                  <div className="flex flex-wrap gap-3">
                    {/* Generate Doctor Join — always available once session exists */}
                    <button
                      type="button"
                      disabled={joinDisabled}
                      onClick={onGenerateDoctorJoin}
                      className={actionButtonClass()}
                    >
                      {actionState.loading && actionState.kind === 'join' ? 'Preparing...' : 'Generate Doctor Join'}
                    </button>

                    {/* Start Session - shown when not yet live */}
                    {session.sessionStatus !== 'LIVE' && session.sessionStatus !== 'COMPLETED' && (
                      <button
                        type="button"
                        disabled={startDisabled}
                        onClick={onStartSession}
                        className={actionButtonClass('success')}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {actionState.loading && actionState.kind === 'start' ? 'Starting...' : 'Start Session'}
                      </button>
                    )}

                    {/* Complete Telemedicine - shown only when live */}
                    {session.sessionStatus === 'LIVE' && (
                      <button
                        type="button"
                        disabled={endDisabled}
                        onClick={onEndSession}
                        className={actionButtonClass('danger')}
                      >
                        {actionState.loading && actionState.kind === 'end' ? 'Completing...' : 'Complete Telemedicine'}
                      </button>
                    )}
                  </div>
                )}

                {joinInfo ? (
                  <FeatureNotice
                    tone="info"
                    title={joinInfo.publicRoom ? 'Public room is ready' : 'Doctor join token is ready'}
                    message={
                      joinInfo.publicRoom
                        ? `Room ${joinInfo.roomId} is prepared as a public Jitsi room. No JWT is required to join.`
                        : `Room ${joinInfo.roomId} is prepared. Token expires ${formatDateTime(joinInfo.expiresAt)}.`
                    }
                  />
                ) : null}
              </div>

              <div className="space-y-4 rounded-3xl border p-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.6)' }}>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                    Readiness
                  </p>
                </div>

                {!session ? (
                  <FeatureNotice
                    tone="info"
                    title="No session yet"
                    message="Create the session first, then the readiness checks will track when both sides join."
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          Doctor joined
                        </p>
                        <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                          {readiness?.doctorJoined ? 'Yes' : 'No'}
                        </p>
                      </div>
                      <div className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          Patient joined
                        </p>
                        <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                          {readiness?.patientJoined ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-3xl border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                      <div className="flex items-center gap-2">
                        <Radio className="h-4 w-4" style={{ color: readiness?.ready ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                          {readiness?.ready ? 'Both participants are ready.' : 'Waiting for both participants.'}
                        </p>
                      </div>
                      <p className="mt-3 text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Current backend readiness status: {session.sessionStatus}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          Started at
                        </p>
                        <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                          {formatDateTime(session.startedAt)}
                        </p>
                      </div>
                      <div className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          Ended at
                        </p>
                        <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                          {formatDateTime(session.endedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <Clock3 className="h-4 w-4 animate-spin" />
                Refreshing session details...
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </TelemedicineSection>
  )
}

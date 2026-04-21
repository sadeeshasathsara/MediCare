import { useEffect, useRef, useState } from 'react'
import { Loader2, Video } from 'lucide-react'

import FeatureNotice from '@/features/telemedicine/components/FeatureNotice'
import StatusBadge from '@/features/telemedicine/components/StatusBadge'
import TelemedicineSection from '@/features/telemedicine/components/TelemedicineSection'
import {
  buildJitsiConfigHash,
  buildJitsiOrigin,
  formatDateTime,
} from '@/features/telemedicine/services/telemedicineTypes'
import {
  getNormalizedJitsiDomain,
  loadJitsiExternalApi,
} from '@/features/telemedicine/services/loadJitsiExternalApi'

export default function LiveConsultationPanel({
  currentUser,
  session,
  joinInfo,
  participantLabel = 'participant',
  allowEmbed = true,
  blockedEmbedMessage = '',
  fullscreen = false,
}) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)
  const [embedState, setEmbedState] = useState({ status: 'idle', message: '' })
  const [participantCount, setParticipantCount] = useState(1)
  const [retryIndex, setRetryIndex] = useState(0)

  const jitsiDomain = joinInfo?.jitsiDomain
  const roomId = joinInfo?.roomId
  const token = joinInfo?.token

  useEffect(() => {
    const containerNode = containerRef.current
    if (!jitsiDomain || !roomId || !containerNode || !allowEmbed) return undefined

    let cancelled = false
    let teardown = () => { }

    async function mountJitsi() {
      setEmbedState({ status: 'loading', message: 'Loading the Jitsi meeting frame...' })

      try {
        const JitsiMeetExternalAPI = await loadJitsiExternalApi(jitsiDomain)
        if (cancelled || !containerNode) return

        if (apiRef.current) {
          apiRef.current.dispose()
          apiRef.current = null
        }

        containerNode.innerHTML = ''

        const domain = getNormalizedJitsiDomain(jitsiDomain)
        const syncLargeVideoLayout = () => {
          try {
            const frameWidth = containerNode.clientWidth || 1280
            const frameHeight = containerNode.clientHeight || 720
            jitsiApi.executeCommand('resizeLargeVideo', frameWidth, frameHeight)
          } catch {
            // Ignore optional layout commands when unsupported.
          }
        }

        const jitsiOptions = {
          roomName: roomId,
          parentNode: containerNode,
          width: '100%',
          height: '100%',
          userInfo: {
            displayName: `${participantLabel === 'doctor' ? 'Doctor' : participantLabel === 'patient' ? 'Patient' : 'Participant'}: ${currentUser?.name || 'Guest'}`,
            email: currentUser?.email,
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            prejoinConfig: {
              enabled: false,
            },
            requireDisplayName: false,
            disableDeepLinking: true,
            disableSelfView: false,
          },
          interfaceConfigOverwrite: {
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          },
        }

        if (token) {
          jitsiOptions.jwt = token
        }

        const jitsiApi = new JitsiMeetExternalAPI(domain, jitsiOptions)
        const configHash = buildJitsiConfigHash()
        let layoutSyncTimeoutId = null
        const syncParticipantCount = () => {
          try {
            const remoteCount = Number(jitsiApi.getNumberOfParticipants?.() || 0)
            setParticipantCount(remoteCount + 1)
          } catch {
            setParticipantCount(1)
          }
        }

        jitsiApi.addListener('videoConferenceJoined', () => {
          window.clearTimeout(layoutSyncTimeoutId)
          layoutSyncTimeoutId = window.setTimeout(syncLargeVideoLayout, 250)
          syncParticipantCount()
        })
        jitsiApi.addListener('participantJoined', syncParticipantCount)
        jitsiApi.addListener('participantLeft', syncParticipantCount)

        try {
          jitsiApi.executeCommand('overwriteConfig', {
            prejoinPageEnabled: false,
            prejoinConfig: {
              enabled: false,
            },
            requireDisplayName: false,
            disableDeepLinking: true,
          })
        } catch {
          // Ignore optional runtime config tweaks when the provider does not support them.
        }

        if (configHash) {
          try {
            const iframe = containerNode.querySelector('iframe')
            if (iframe?.src && !iframe.src.includes('#')) {
              iframe.src = `${iframe.src}#${configHash}`
            }
          } catch {
            // Ignore iframe src adjustments if the provider changes its embed internals.
          }
        }

        window.addEventListener('resize', syncLargeVideoLayout)

        apiRef.current = jitsiApi
        setEmbedState({ status: 'ready', message: 'Meeting ready.' })
        teardown = () => {
          window.removeEventListener('resize', syncLargeVideoLayout)
          window.clearTimeout(layoutSyncTimeoutId)
          setParticipantCount(1)
        }
      } catch (error) {
        if (cancelled) return
        setEmbedState({
          status: 'error',
          message: error?.message || 'Unable to load the Jitsi meeting frame.',
        })
      }
    }

    mountJitsi()

    return () => {
      cancelled = true
      teardown()
      if (apiRef.current) {
        try {
          apiRef.current.dispose()
        } catch {
          // Ignore dispose errors when the provider already tore down the frame.
        }
        apiRef.current = null
      }
      containerNode.innerHTML = ''
    }
  }, [allowEmbed, currentUser?.email, currentUser?.name, jitsiDomain, participantLabel, roomId, token, retryIndex])

  if (fullscreen) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {!joinInfo && session ? (
          <div className="p-4">
            <FeatureNotice
              tone="warning"
              title="Join access required"
              message={`Prepare ${participantLabel} join access to launch the Jitsi consultation here. If JWT credentials are missing, the telemedicine service will fall back to a public Jitsi room.`}
            />
          </div>
        ) : null}

        {joinInfo && !allowEmbed ? (
          <div className="p-4">
            <FeatureNotice
              tone="info"
              title="Waiting room"
              message={
                blockedEmbedMessage ||
                'The consultation room is ready. Waiting for the doctor before entering the live meeting.'
              }
            />
          </div>
        ) : null}

        {joinInfo && embedState.status === 'error' ? (
          <div className="p-4">
            <FeatureNotice tone="error" title="Jitsi embed failed" message={embedState.message}>
              <button
                type="button"
                onClick={() => setRetryIndex((index) => index + 1)}
                className="mt-3 inline-flex items-center rounded-2xl border px-4 py-2 text-sm font-semibold transition hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
              >
                Retry meeting load
              </button>
            </FeatureNotice>
          </div>
        ) : null}

        {joinInfo && embedState.status === 'loading' ? (
          <div className="px-4">
            <div
              className="flex min-h-[6rem] items-center justify-center rounded-[24px] border border-dashed"
              style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.5)' }}
            >
              <div className="flex items-center gap-3 text-sm font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <Loader2 className="h-4 w-4 animate-spin" />
                {embedState.message}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex-1 min-h-0 p-3 lg:p-4">
          <div className="relative h-full w-full">
            <div
              ref={containerRef}
              className="h-full w-full overflow-hidden rounded-[18px] bg-black"
            />

            {!joinInfo || !allowEmbed ? (
              <div
                className="absolute inset-0 flex h-full min-h-[16rem] items-center justify-center rounded-[18px] border px-6 py-10 text-center"
                style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
              >
                <div className="max-w-md space-y-3">
                  <p className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                    Meeting frame will appear here
                  </p>
                  <p className="text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {joinInfo && !allowEmbed
                      ? 'Waiting for the doctor to join before mounting the live meeting.'
                      : 'Prepare consultation join access to mount the live Jitsi room.'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <TelemedicineSection
      title="Live Consultation"
      description="Prepare join access, then launch the Jitsi room inline here for the active consultation."
    >
      <div className="space-y-5">
        {!session ? (
          <FeatureNotice
            tone="info"
            title="No session selected"
            message="The live meeting embed will appear here when consultation join access is ready."
          />
        ) : null}

        {session ? (
          <div className="rounded-[26px] border p-5" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={session.sessionStatus} />
                  <span className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {session.jitsiRoomId || 'Room pending'}
                  </span>
                </div>
                <h3 className="text-xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                  {session.jitsiRoomId || 'No Jitsi room yet'}
                </h3>
                <p className="text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Jitsi domain:{' '}
                  {joinInfo?.jitsiDomain
                    ? buildJitsiOrigin(joinInfo.jitsiDomain)
                    : 'Generate a join token to resolve the Jitsi domain.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.65)' }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Join access
                  </p>
                  <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                    {!joinInfo ? 'Not generated' : joinInfo.publicRoom ? 'Public room' : 'JWT ready'}
                  </p>
                </div>
                <div className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.65)' }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Access details
                  </p>
                  <p className="mt-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                    {joinInfo?.publicRoom ? 'Public room, no token needed' : formatDateTime(joinInfo?.expiresAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!joinInfo && session ? (
          <FeatureNotice
            tone="warning"
            title="Join access required"
            message={`Prepare ${participantLabel} join access to launch the Jitsi consultation here. If JWT credentials are missing, the telemedicine service will fall back to a public Jitsi room.`}
          />
        ) : null}

        {joinInfo && !allowEmbed ? (
          <FeatureNotice
            tone="info"
            title="Waiting room"
            message={
              blockedEmbedMessage ||
              'The consultation room is ready. Waiting for the doctor before entering the live meeting.'
            }
          />
        ) : null}

        {joinInfo && embedState.status === 'error' ? (
          <FeatureNotice tone="error" title="Jitsi embed failed" message={embedState.message}>
            <button
              type="button"
              onClick={() => setRetryIndex((index) => index + 1)}
                className="mt-3 inline-flex items-center rounded-2xl border px-4 py-2 text-sm font-semibold transition hover:bg-black/3 dark:hover:bg-white/5"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            >
              Retry meeting load
            </button>
          </FeatureNotice>
        ) : null}

        {joinInfo && embedState.status === 'loading' ? (
          <div
            className="flex min-h-40 items-center justify-center rounded-3xl border border-dashed"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.5)' }}
          >
            <div className="flex items-center gap-3 text-sm font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              {embedState.message}
            </div>
          </div>
        ) : null}

        <div
          className="overflow-hidden rounded-[28px] border"
          style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.7)' }}
        >
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                Inline consultation meeting
              </p>
            </div>
            <div className="flex items-center gap-3">
              {joinInfo ? (
                <span className="text-xs uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Embedded via Jitsi External API
                </span>
              ) : null}
              {joinInfo ? (
                <span className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                  Participants: {participantCount}
                </span>
              ) : null}
            </div>
          </div>

          <div className="relative w-full">
            <div
              ref={containerRef}
              className="w-full bg-black"
              style={{
                aspectRatio: '16 / 9',
                minHeight: '20rem',
                maxHeight: '34rem',
              }}
            />

            {!joinInfo || !allowEmbed ? (
              <div className="absolute inset-0 flex min-h-[24rem] items-center justify-center px-6 py-10 text-center">
                <div className="max-w-md space-y-3">
                  <p className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                    Meeting frame will appear here
                  </p>
                  <p className="text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {joinInfo && !allowEmbed
                      ? 'Waiting for the doctor to join before mounting the live meeting.'
                      : 'Prepare consultation join access to mount the live Jitsi room inline. You can still review the appointment and session status before entering the consultation.'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </TelemedicineSection>
  )
}


import { AlertTriangle, Siren, Stethoscope, ListChecks, UserRound, Phone, Mail, BadgeInfo } from 'lucide-react'

const urgencyStyles = {
  LOW: {
    backgroundColor: 'hsl(142 76% 36% / 0.12)',
    color: 'hsl(142 76% 36%)',
    borderColor: 'hsl(142 76% 36% / 0.24)',
  },
  MODERATE: {
    backgroundColor: 'hsl(38 92% 50% / 0.12)',
    color: 'hsl(31 92% 45%)',
    borderColor: 'hsl(31 92% 45% / 0.24)',
  },
  HIGH: {
    backgroundColor: 'hsl(18 95% 53% / 0.12)',
    color: 'hsl(18 95% 45%)',
    borderColor: 'hsl(18 95% 45% / 0.24)',
  },
  EMERGENCY: {
    backgroundColor: 'hsl(var(--destructive) / 0.12)',
    color: 'hsl(var(--destructive))',
    borderColor: 'hsl(var(--destructive) / 0.24)',
  },
}

function normalizeUrgency(value) {
  const urgency = String(value || '').trim().toUpperCase()
  if (urgencyStyles[urgency]) return urgency
  return 'MODERATE'
}

export default function SymptomResultCard({ result, doctors = [], doctorLookupStatus = 'idle', doctorLookupError = '' }) {
  if (!result) return null

  const urgency = normalizeUrgency(result.urgencyLevel)
  const conditions = Array.isArray(result.possibleConditions)
    ? result.possibleConditions.filter((item) => typeof item === 'string' && item.trim())
    : []
  const hasDoctors = Array.isArray(doctors) && doctors.length > 0

  return (
    <section
      className="rounded-2xl border p-5 md:p-6 space-y-5"
      style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          AI Triage Result
        </h2>
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
          style={urgencyStyles[urgency]}
        >
          <Siren size={14} />
          Urgency: {urgency}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: 'hsl(var(--background) / 0.7)', borderColor: 'hsl(var(--border))' }}
        >
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            <Stethoscope size={16} />
            Possible Conditions
          </div>
          {conditions.length > 0 ? (
            <ul className="space-y-1 list-disc pl-5 text-sm" style={{ color: 'hsl(var(--foreground) / 0.9)' }}>
              {conditions.map((condition, index) => (
                <li key={`${condition}-${index}`}>{condition}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
              No conditions returned.
            </p>
          )}
        </div>

        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: 'hsl(var(--background) / 0.7)', borderColor: 'hsl(var(--border))' }}
        >
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            <ListChecks size={16} />
            Recommended Doctor
          </div>
          <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.9)' }}>
            {result.recommendedSpecialty || result.recommendedDoctor || 'General Practice'}
          </p>
          <p className="mt-1 text-xs leading-5" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Doctors are filtered from the registered doctor list when their specialty matches this recommendation.
          </p>
        </div>
      </div>

      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: 'hsl(var(--background) / 0.7)', borderColor: 'hsl(var(--border))' }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            <UserRound size={16} />
            Doctors Matching This Specialty
          </div>
          {doctorLookupStatus === 'loading' && (
            <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Loading doctors...
            </span>
          )}
        </div>

        {doctorLookupError ? (
          <div
            className="flex items-start gap-2 rounded-lg border p-3 text-sm"
            style={{ backgroundColor: 'hsl(var(--destructive) / 0.08)', borderColor: 'hsl(var(--destructive) / 0.2)', color: 'hsl(var(--destructive))' }}
          >
            <BadgeInfo size={16} className="mt-0.5 shrink-0" />
            <p>{doctorLookupError}</p>
          </div>
        ) : hasDoctors ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {doctors.map((doctor) => (
              <article
                key={doctor.id || doctor.userId || doctor.email || doctor.fullName}
                className="rounded-xl border p-4 transition-colors"
                style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {doctor.fullName || 'Registered Doctor'}
                    </h3>
                    <p className="mt-1 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {doctor.specialty || result.recommendedSpecialty || 'General Practice'}
                    </p>
                  </div>
                  <span
                    className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      borderColor: 'hsl(var(--primary) / 0.2)',
                      backgroundColor: 'hsl(var(--primary) / 0.08)',
                      color: 'hsl(var(--primary))',
                    }}
                  >
                    Verified
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs" style={{ color: 'hsl(var(--foreground) / 0.88)' }}>
                  {doctor.id && (
                    <div className="flex items-center gap-2">
                      <BadgeInfo size={13} style={{ color: 'hsl(var(--muted-foreground))' }} />
                      <span>Doctor ID: {doctor.id}</span>
                    </div>
                  )}
                  {doctor.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} style={{ color: 'hsl(var(--muted-foreground))' }} />
                      <span>{doctor.phone}</span>
                    </div>
                  )}
                  {doctor.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} style={{ color: 'hsl(var(--muted-foreground))' }} />
                      <span>{doctor.email}</span>
                    </div>
                  )}
                  {doctor.consultationFee !== undefined && doctor.consultationFee !== null && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-current" />
                      <span>Consultation fee: {doctor.consultationFee}</span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div
            className="rounded-lg border border-dashed p-4 text-sm"
            style={{ backgroundColor: 'hsl(var(--muted) / 0.18)', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
          >
            No doctors are registered for {result.recommendedSpecialty || 'this specialty'} right now.
          </div>
        )}
      </div>

      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: 'hsl(var(--background) / 0.7)', borderColor: 'hsl(var(--border))' }}
      >
        <div className="mb-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
          Advice
        </div>
        <p className="text-sm leading-6 whitespace-pre-wrap" style={{ color: 'hsl(var(--foreground) / 0.9)' }}>
          {result.advice || 'Please consult a licensed clinician for further guidance.'}
        </p>
      </div>

      <div
        className="flex items-start gap-2 rounded-xl border p-3 text-sm"
        style={{ backgroundColor: 'hsl(var(--destructive) / 0.08)', borderColor: 'hsl(var(--destructive) / 0.2)', color: 'hsl(var(--destructive))' }}
      >
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <p>{result.disclaimer || 'This response is AI-generated and is not a medical diagnosis.'}</p>
      </div>
    </section>
  )
}

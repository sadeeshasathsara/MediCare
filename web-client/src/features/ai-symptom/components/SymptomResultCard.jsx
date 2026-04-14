import { AlertTriangle, Siren, Stethoscope, ListChecks } from 'lucide-react'

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

export default function SymptomResultCard({ result }) {
  if (!result) return null

  const urgency = normalizeUrgency(result.urgencyLevel)
  const conditions = Array.isArray(result.possibleConditions)
    ? result.possibleConditions.filter((item) => typeof item === 'string' && item.trim())
    : []

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
              {conditions.map((condition) => (
                <li key={condition}>{condition}</li>
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
          <p className="text-sm" style={{ color: 'hsl(var(--foreground) / 0.9)' }}>
            {result.recommendedDoctor || 'General Physician'}
          </p>
        </div>
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

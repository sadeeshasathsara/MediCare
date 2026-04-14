import { AlertTriangle, Sparkles } from 'lucide-react'

export default function SymptomResultCard({ result }) {
  if (!result) return null

  return (
    <section
      className="rounded-2xl border p-5 md:p-6"
      style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            AI Triage Result
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Model: {result.model || 'N/A'}
          </p>
        </div>
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' }}
        >
          <Sparkles size={14} />
          AI Generated
        </div>
      </div>

      <div
        className="mt-4 rounded-xl border p-4 text-sm leading-6 whitespace-pre-wrap"
        style={{ backgroundColor: 'hsl(var(--background) / 0.75)', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
      >
        {result.analysis}
      </div>

      <div
        className="mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm"
        style={{ backgroundColor: 'hsl(var(--destructive) / 0.08)', borderColor: 'hsl(var(--destructive) / 0.2)', color: 'hsl(var(--destructive))' }}
      >
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <p>{result.disclaimer}</p>
      </div>
    </section>
  )
}

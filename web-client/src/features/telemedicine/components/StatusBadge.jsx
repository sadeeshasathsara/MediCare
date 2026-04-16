import { humanizeStatus } from '@/features/telemedicine/services/telemedicineTypes'

/* ─── Dot colours ─────────────────────────────────────────────────────────── */
const DOT_STYLE = {
  PENDING:     'bg-amber-400',
  ACCEPTED:    'bg-emerald-400',
  REJECTED:    'bg-rose-400',
  RESCHEDULED: 'bg-sky-400',
  SCHEDULED:   'bg-indigo-400',
  WAITING:     'bg-orange-400',
  LIVE:        'bg-red-400 animate-pulse',
  COMPLETED:   'bg-slate-400',
  MISSED:      'bg-orange-400',
  CANCELLED:   'bg-rose-400',
  DRAFT:       'bg-zinc-400',
  ISSUED:      'bg-cyan-400',
  DISPENSED:   'bg-emerald-400',
}

/* ─── Badge colours ───────────────────────────────────────────────────────── */
const BADGE_STYLE = {
  PENDING:     'bg-amber-500 text-white border-amber-600',
  ACCEPTED:    'bg-emerald-600 text-white border-emerald-700',
  REJECTED:    'bg-rose-500 text-white border-rose-600',
  RESCHEDULED: 'bg-sky-500 text-white border-sky-600',
  SCHEDULED:   'bg-indigo-500 text-white border-indigo-600',
  WAITING:     'bg-orange-500 text-white border-orange-600',
  LIVE:        'bg-red-500 text-white border-red-600',
  COMPLETED:   'bg-slate-500 text-white border-slate-600',
  MISSED:      'bg-orange-500 text-white border-orange-600',
  CANCELLED:   'bg-rose-500 text-white border-rose-600',
  DRAFT:       'bg-zinc-500 text-white border-zinc-600',
  ISSUED:      'bg-cyan-600 text-white border-cyan-700',
  DISPENSED:   'bg-emerald-600 text-white border-emerald-700',
}

export default function StatusBadge({ status, className = '' }) {
  const normalized = String(status || '').toUpperCase()
  const badge = BADGE_STYLE[normalized] || BADGE_STYLE.DRAFT
  const dot   = DOT_STYLE[normalized]  || DOT_STYLE.DRAFT
  const isLive = normalized === 'LIVE'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] shadow-sm ${badge} ${className}`}
    >
      {/* Dot — double ring animation for LIVE */}
      <span className="relative flex h-2 w-2 shrink-0">
        {isLive && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dot}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      {humanizeStatus(normalized)}
    </span>
  )
}

import { humanizeStatus } from '@/features/telemedicine/services/telemedicineTypes'

const STATUS_STYLES = {
  PENDING: 'border-amber-200 bg-amber-100/80 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
  ACCEPTED: 'border-emerald-200 bg-emerald-100/80 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100',
  REJECTED: 'border-rose-200 bg-rose-100/80 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100',
  RESCHEDULED: 'border-sky-200 bg-sky-100/80 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100',
  SCHEDULED: 'border-indigo-200 bg-indigo-100/80 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-100',
  WAITING: 'border-orange-200 bg-orange-100/80 text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100',
  LIVE: 'border-emerald-300 bg-emerald-200/80 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-50',
  COMPLETED: 'border-slate-200 bg-slate-100/80 text-slate-900 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100',
  MISSED: 'border-orange-200 bg-orange-100/80 text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100',
  CANCELLED: 'border-rose-200 bg-rose-100/80 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100',
  DRAFT: 'border-zinc-200 bg-zinc-100/80 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-100',
  ISSUED: 'border-cyan-200 bg-cyan-100/80 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-100',
  DISPENSED: 'border-emerald-200 bg-emerald-100/80 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100',
}

export default function StatusBadge({ status, className = '' }) {
  const normalizedStatus = String(status || '').toUpperCase()
  const appearance = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.DRAFT

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${appearance} ${className}`}>
      {humanizeStatus(normalizedStatus)}
    </span>
  )
}

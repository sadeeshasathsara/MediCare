import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

const TONE_MAP = {
  info: {
    Icon: Info,
    border: 'border-sky-200/80',
    background: 'bg-sky-50/80 dark:bg-sky-950/30',
    text: 'text-sky-900 dark:text-sky-100',
  },
  success: {
    Icon: CheckCircle2,
    border: 'border-emerald-200/80',
    background: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    text: 'text-emerald-900 dark:text-emerald-100',
  },
  warning: {
    Icon: AlertTriangle,
    border: 'border-amber-200/80',
    background: 'bg-amber-50/80 dark:bg-amber-950/30',
    text: 'text-amber-950 dark:text-amber-100',
  },
  error: {
    Icon: XCircle,
    border: 'border-rose-200/80',
    background: 'bg-rose-50/80 dark:bg-rose-950/30',
    text: 'text-rose-950 dark:text-rose-100',
  },
}

export default function FeatureNotice({ tone = 'info', title, message, children }) {
  const { Icon, border, background, text } = TONE_MAP[tone] || TONE_MAP.info

  return (
    <div className={`rounded-2xl border px-4 py-3 ${border} ${background} ${text}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          {message ? <p className="text-sm leading-6 opacity-90">{message}</p> : null}
          {children}
        </div>
      </div>
    </div>
  )
}

import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

const TONE_MAP = {
  info: {
    Icon: Info,
    border: 'border-blue-700/45',
    background: 'bg-blue-100/45',
    title: 'text-blue-900',
    body: 'text-blue-800',
    iconWrap: 'bg-blue-200/65',
    icon: 'text-blue-800',
  },
  success: {
    Icon: CheckCircle2,
    border: 'border-green-700/45',
    background: 'bg-green-100/45',
    title: 'text-green-900',
    body: 'text-green-800',
    iconWrap: 'bg-green-200/65',
    icon: 'text-green-800',
  },
  warning: {
    Icon: AlertTriangle,
    border: 'border-amber-700/45',
    background: 'bg-amber-100/45',
    title: 'text-amber-900',
    body: 'text-amber-800',
    iconWrap: 'bg-amber-200/65',
    icon: 'text-amber-800',
  },
  error: {
    Icon: XCircle,
    border: 'border-rose-700/45',
    background: 'bg-rose-100/45',
    title: 'text-rose-900',
    body: 'text-rose-800',
    iconWrap: 'bg-rose-200/65',
    icon: 'text-rose-800',
  },
}
export default function FeatureNotice({ tone = 'info', title, message, children }) {
  const { Icon, border, background, title: titleTone, body, iconWrap, icon } = TONE_MAP[tone] || TONE_MAP.info

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${border} ${background}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${iconWrap}`}>
          <Icon className={`h-4 w-4 ${icon}`} />
        </span>
        <div className="space-y-1">
          {title ? <p className={`text-sm font-semibold ${titleTone}`}>{title}</p> : null}
          {message ? <p className={`text-sm leading-6 ${body}`}>{message}</p> : null}
          {children}
        </div>
      </div>
    </div>
  )
}

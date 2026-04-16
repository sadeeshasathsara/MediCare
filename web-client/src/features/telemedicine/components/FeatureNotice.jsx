import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

const TONE_MAP = {
  info: {
    Icon: Info,
    toneClass: 'tm-notice-info',
  },
  success: {
    Icon: CheckCircle2,
    toneClass: 'tm-notice-success',
  },
  warning: {
    Icon: AlertTriangle,
    toneClass: 'tm-notice-warning',
  },
  error: {
    Icon: XCircle,
    toneClass: 'tm-notice-error',
  },
}
export default function FeatureNotice({ tone = 'info', title, message, children }) {
  const { Icon, toneClass } = TONE_MAP[tone] || TONE_MAP.info

  return (
    <div className={`tm-notice ${toneClass} rounded-2xl border px-4 py-3 shadow-sm`}>
      <div className="flex items-start gap-3">
        <span className="tm-notice-icon-wrap mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
          <Icon className="tm-notice-icon h-4 w-4" />
        </span>
        <div className="space-y-1">
          {title ? <p className="tm-notice-title text-sm font-semibold">{title}</p> : null}
          {message ? <p className="tm-notice-body text-sm leading-6">{message}</p> : null}
          {children}
        </div>
      </div>
    </div>
  )
}

export default function TelemedicineSection({ title, description, actions, children, className = '' }) {
  return (
    <section
      className={`rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-white/[0.03] ${className}`}
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
            {title}
          </h2>
          {description ? (
            <p className="max-w-2xl text-sm leading-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

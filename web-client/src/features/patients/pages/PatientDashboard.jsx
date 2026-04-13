import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getPatientHistory, getPatientPrescriptions, getPatientProfile, listPatientReports } from '@/features/patients/services/patientApi'
import { RefreshCcw, Calendar, Bell, CreditCard, Video, Folder, User, Stethoscope, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const PROFILE_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

function isProfileIncomplete(p) {
    const nameOk = Boolean(p?.name && String(p.name).trim())
    const dobOk = Boolean(p?.dob)
    const phoneOk = Boolean(p?.contact?.phone && String(p.contact.phone).trim())

    const addr = p?.address || {}
    const addrOk = Boolean(
        addr?.line1 && String(addr.line1).trim() &&
        addr?.city && String(addr.city).trim() &&
        addr?.state && String(addr.state).trim() &&
        addr?.postalCode && String(addr.postalCode).trim() &&
        addr?.country && String(addr.country).trim(),
    )

    return !(nameOk && dobOk && phoneOk && addrOk)
}

function normalizeFirstName(value) {
    if (!value) return ''
    let s = String(value).trim()
    if (!s) return ''

    // If we ever get an email-like string, discard the domain.
    s = s.split('@')[0]

    // Prefer true first token (space separated), otherwise split common separators.
    const token = s.split(/\s+/)[0].split(/[._-]+/)[0]
    const cleaned = String(token || '').trim()
    if (!cleaned) return ''

    // Title-case the first character for nicer display.
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function profileChecklist(p) {
    const items = [
        {
            key: 'name',
            label: 'Name',
            ok: Boolean(p?.name && String(p.name).trim()),
        },
        {
            key: 'dob',
            label: 'Date of birth',
            ok: Boolean(p?.dob),
        },
        {
            key: 'phone',
            label: 'Phone number',
            ok: Boolean(p?.contact?.phone && String(p.contact.phone).trim()),
        },
        {
            key: 'address',
            label: 'Address',
            ok: Boolean(
                p?.address?.line1 && String(p.address.line1).trim() &&
                p?.address?.city && String(p.address.city).trim() &&
                p?.address?.state && String(p.address.state).trim() &&
                p?.address?.postalCode && String(p.address.postalCode).trim() &&
                p?.address?.country && String(p.address.country).trim(),
            ),
        },
    ]

    const completed = items.filter((i) => i.ok).length
    const total = items.length
    const percent = total ? Math.round((completed / total) * 100) : 0
    const missingLabels = items.filter((i) => !i.ok).map((i) => i.label)

    return { items, completed, total, percent, missingLabels }
}

function QuickActionCard({ title, icon, value, hint, to }) {
    const card = (
        <div
            className="rounded-xl border p-5 h-full transition-colors"
            style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span style={{ color: 'hsl(var(--muted-foreground))' }}>{icon}</span>
                        <div className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>{title}</div>
                    </div>
                    <div className="mt-3 text-2xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{value}</div>
                    {hint ? (
                        <div className="mt-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{hint}</div>
                    ) : null}
                </div>
                {to ? (
                    <div className="shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        <ArrowRight size={18} />
                    </div>
                ) : null}
            </div>
        </div>
    )

    if (!to) return card

    return (
        <Link
            to={to}
            className="block rounded-xl focus:outline-none focus-visible:ring-2"
            style={{ outlineColor: 'hsl(var(--ring))' }}
        >
            {card}
        </Link>
    )
}

function WidgetCard({ title, icon, children }) {
    return (
        <section
            className="rounded-xl border p-5 h-full"
            style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
        >
            <div className="flex items-center gap-2">
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>{icon}</span>
                <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                    {title}
                </h3>
            </div>
            <div className="mt-3">{children}</div>
        </section>
    )
}

function StatusPill({ tone = 'neutral', children }) {
    const styles =
        tone === 'success'
            ? { backgroundColor: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' }
            : tone === 'danger'
                ? { backgroundColor: 'hsl(var(--destructive) / 0.10)', color: 'hsl(var(--destructive))' }
                : { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={styles}>
            {children}
        </span>
    )
}

export default function PatientDashboard() {
    const { user } = useAuth()
    const userId = user?.id

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [profile, setProfile] = useState(null)
    const [reportsCount, setReportsCount] = useState(null)
    const [historyStatus, setHistoryStatus] = useState('unknown')
    const [prescriptionsStatus, setPrescriptionsStatus] = useState('unknown')
    const [profilePromptSnoozedUntil, setProfilePromptSnoozedUntil] = useState(0)

    const canUse = useMemo(() => Boolean(userId), [userId])

    const load = async () => {
        if (!userId) return

        setLoading(true)
        setError('')

        try {
            const [p, reports] = await Promise.all([
                getPatientProfile(userId),
                listPatientReports(userId),
            ])

            setProfile(p)
            setReportsCount(Array.isArray(reports) ? reports.length : 0)

            // These endpoints exist but may be placeholders (503). We probe them
            // to drive a clear “available/unavailable” status on the dashboard.
            try {
                await getPatientHistory(userId)
                setHistoryStatus('ok')
            } catch (e) {
                setHistoryStatus(e?.response?.status === 503 ? 'unavailable' : 'error')
            }

            try {
                await getPatientPrescriptions(userId)
                setPrescriptionsStatus('ok')
            } catch (e) {
                setPrescriptionsStatus(e?.response?.status === 503 ? 'unavailable' : 'error')
            }
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to load dashboard')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    useEffect(() => {
        if (!userId) return
        const key = `patient.profileUpdateSnoozeUntil:${userId}`
        const raw = localStorage.getItem(key)
        const parsed = raw ? Number(raw) : 0
        setProfilePromptSnoozedUntil(Number.isFinite(parsed) ? parsed : 0)
    }, [userId])

    if (!canUse) {
        return (
            <div className="rounded-xl border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                <h1 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Patient Dashboard</h1>
                <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Please log in to view your dashboard.
                </p>
            </div>
        )
    }

    const historyHint =
        historyStatus === 'unavailable'
            ? 'Not available yet'
            : historyStatus === 'error'
                ? 'Error loading'
                : ''
    const prescriptionsHint =
        prescriptionsStatus === 'unavailable'
            ? 'Not available yet'
            : prescriptionsStatus === 'error'
                ? 'Error loading'
                : ''

    const showProfilePrompt =
        !loading &&
        !error &&
        isProfileIncomplete(profile) &&
        Date.now() > (profilePromptSnoozedUntil || 0)

    const displayName =
        normalizeFirstName(profile?.name) ||
        normalizeFirstName(user?.name) ||
        'Patient'
    let todayLabel = ''
    try {
        todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    } catch {
        todayLabel = ''
    }

    const checklist = profileChecklist(profile)
    const profileOk = checklist.completed === checklist.total && checklist.total > 0

    const historyTone = historyStatus === 'ok' ? 'success' : historyStatus === 'error' ? 'danger' : 'neutral'
    const prescriptionsTone = prescriptionsStatus === 'ok' ? 'success' : prescriptionsStatus === 'error' ? 'danger' : 'neutral'

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    {todayLabel ? (
                        <div className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{todayLabel}</div>
                    ) : null}
                    <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                        Welcome{displayName ? `, ${displayName}` : ''}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Manage your profile, documents, and care tools in one place.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        to="/patient/profile"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    >
                        <User size={16} />
                        Profile
                    </Link>
                    <button
                        onClick={load}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        disabled={loading}
                    >
                        <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border p-4" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                    <div className="text-sm font-semibold" style={{ color: 'hsl(var(--destructive))' }}>Couldn’t load your dashboard</div>
                    <div className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{error}</div>
                </div>
            ) : null}

            {showProfilePrompt ? (
                <div
                    className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                >
                    <div className="min-w-0">
                        <div className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                            Finish setting up your profile
                        </div>
                        <div className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Completing your details helps your care team serve you better.
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            to="/patient/profile"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                        >
                            Complete profile
                        </Link>
                        <button
                            onClick={() => {
                                const until = Date.now() + PROFILE_PROMPT_SNOOZE_MS
                                const key = `patient.profileUpdateSnoozeUntil:${userId}`
                                localStorage.setItem(key, String(until))
                                setProfilePromptSnoozedUntil(until)
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                            style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        >
                            Remind me later
                        </button>
                    </div>
                </div>
            ) : null}

            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Quick actions</h2>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Jump back into the areas you use most.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <QuickActionCard
                        title="Medical reports"
                        icon={<Folder size={16} />}
                        value={loading && reportsCount === null ? <Skeleton className="h-7 w-14" /> : String(reportsCount ?? 0)}
                        hint="Upload and organize your documents"
                        to="/patient/reports"
                    />
                    <QuickActionCard
                        title="History"
                        icon={<Calendar size={16} />}
                        value={loading && historyStatus === 'unknown' ? <Skeleton className="h-7 w-24" /> : (historyStatus === 'ok' ? 'Available' : '—')}
                        hint={historyHint || 'Review your medical history'}
                        to="/patient/history"
                    />
                    <QuickActionCard
                        title="Prescriptions"
                        icon={<Stethoscope size={16} />}
                        value={loading && prescriptionsStatus === 'unknown' ? <Skeleton className="h-7 w-24" /> : (prescriptionsStatus === 'ok' ? 'Available' : '—')}
                        hint={prescriptionsHint || 'Check your prescriptions'}
                        to="/patient/prescriptions"
                    />
                    <QuickActionCard
                        title="Profile"
                        icon={<User size={16} />}
                        value={loading && !profile ? <Skeleton className="h-7 w-32" /> : (profileOk ? 'Complete' : `${checklist.percent}%`)}
                        hint={profileOk ? 'Your details are up to date' : 'Finish your details'}
                        to="/patient/profile"
                    />
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border p-5" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Profile checklist</h2>
                            <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                Keep your details accurate for smoother care.
                            </p>
                        </div>
                        {loading && !profile ? (
                            <Skeleton className="h-6 w-24 rounded-full" />
                        ) : profileOk ? (
                            <StatusPill tone="success"><CheckCircle2 size={14} /> Complete</StatusPill>
                        ) : (
                            <StatusPill tone="neutral"><XCircle size={14} /> Needs updates</StatusPill>
                        )}
                    </div>

                    <div className="mt-4 space-y-2">
                        {loading && !profile ? (
                            <>
                                <Skeleton className="h-4 w-64" />
                                <Skeleton className="h-4 w-56" />
                                <Skeleton className="h-4 w-60" />
                                <Skeleton className="h-4 w-52" />
                            </>
                        ) : (
                            checklist.items.map((item) => (
                                <div key={item.key} className="flex items-center gap-2 text-sm">
                                    <span style={{ color: item.ok ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>
                                        {item.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                    </span>
                                    <span style={{ color: 'hsl(var(--foreground))' }}>{item.label}</span>
                                </div>
                            ))
                        )}
                    </div>

                    {!loading && !profileOk && checklist.missingLabels.length > 0 ? (
                        <div className="mt-4 rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))' }}>
                            <div className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                                Next to complete
                            </div>
                            <div className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                {checklist.missingLabels.join(' · ')}
                            </div>
                            <div className="mt-3">
                                <Link
                                    to="/patient/profile"
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                    style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                                >
                                    Update profile
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="rounded-xl border p-5" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                    <div>
                        <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Services</h2>
                        <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            What’s currently available for your account.
                        </p>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                <div className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>History</div>
                            </div>
                            <StatusPill tone={historyTone}>
                                {historyStatus === 'ok' ? <CheckCircle2 size={14} /> : historyStatus === 'error' ? <XCircle size={14} /> : null}
                                {historyStatus === 'ok' ? 'Available' : historyStatus === 'unavailable' ? 'Not available' : historyStatus === 'error' ? 'Error' : 'Checking'}
                            </StatusPill>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Stethoscope size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                <div className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>Prescriptions</div>
                            </div>
                            <StatusPill tone={prescriptionsTone}>
                                {prescriptionsStatus === 'ok' ? <CheckCircle2 size={14} /> : prescriptionsStatus === 'error' ? <XCircle size={14} /> : null}
                                {prescriptionsStatus === 'ok' ? 'Available' : prescriptionsStatus === 'unavailable' ? 'Not available' : prescriptionsStatus === 'error' ? 'Error' : 'Checking'}
                            </StatusPill>
                        </div>
                    </div>

                    <div className="mt-5 rounded-lg border p-4" style={{ backgroundColor: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))' }}>
                        <div className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>Care tools (coming soon)</div>
                        <div className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Telemedicine, appointments, payments, and notifications can appear here once connected.
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                <Video size={16} /> Telemedicine
                            </div>
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                <Bell size={16} /> Notifications
                            </div>
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                <CreditCard size={16} /> Payments
                            </div>
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                <Calendar size={16} /> Appointments
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-xl border p-5" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Upcoming appointments</h2>
                        <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Your next scheduled visits will appear here.
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))', cursor: 'not-allowed' }}
                        title="Appointments are not connected yet"
                    >
                        View all
                        <ArrowRight size={16} />
                    </button>
                </div>

                <div className="mt-4">
                    {loading ? (
                        <div className="space-y-3">
                            <div className="rounded-lg border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
                                <div className="flex items-center justify-between gap-3">
                                    <Skeleton className="h-4 w-56" />
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </div>
                            <div className="rounded-lg border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
                                <div className="flex items-center justify-between gap-3">
                                    <Skeleton className="h-4 w-52" />
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <Skeleton className="h-4 w-44" />
                                    <Skeleton className="h-4 w-28" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border p-4" style={{ backgroundColor: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))' }}>
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    <Calendar size={18} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                                        No upcoming appointments
                                    </div>
                                    <div className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                        When appointment scheduling is connected, you’ll see your date, time, doctor, and visit type here.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Care tools</h2>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Quick snapshots that can appear once services are connected.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <WidgetCard title="Upcoming Appointments" icon={<Calendar size={16} />}>
                        <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Your upcoming visits will appear here.
                        </div>
                        <div className="mt-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Once enabled, you’ll see date, doctor, and visit type.
                        </div>
                    </WidgetCard>

                    <WidgetCard title="Telemedicine" icon={<Video size={16} />}>
                        <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Join virtual consultations from one place.
                        </div>
                        <div className="mt-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Future sessions can show a join link and readiness checks.
                        </div>
                    </WidgetCard>

                    <WidgetCard title="Notifications" icon={<Bell size={16} />}>
                        <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Important updates and reminders.
                        </div>
                        <div className="mt-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            You’ll see provider messages and system alerts here.
                        </div>
                    </WidgetCard>

                    <WidgetCard title="Payments" icon={<CreditCard size={16} />}>
                        <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Track recent charges and receipts.
                        </div>
                        <div className="mt-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Connected payments can show invoice status and totals.
                        </div>
                    </WidgetCard>
                </div>
            </section>
        </div>
    )
}

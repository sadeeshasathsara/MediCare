import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getPatientHistory, getPatientPrescriptions, getPatientProfile, listPatientReports } from '@/features/patients/services/patientApi'
import { RefreshCcw, Calendar, Bell, CreditCard, Video } from 'lucide-react'

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

function StatCard({ title, value, hint, to }) {
    const card = (
        <div
            className="rounded-xl border p-5 h-full"
            style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
        >
            <div className="text-sm font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{title}</div>
            <div className="mt-2 text-2xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{value}</div>
            {hint ? (
                <div className="mt-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{hint}</div>
            ) : null}
        </div>
    )

    if (!to) return card

    return (
        <Link to={to} className="block focus:outline-none">
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

function TableCard({ title, children }) {
    return (
        <section
            className="rounded-xl border p-5 h-full"
            style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
        >
            <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                {title}
            </h3>
            <div className="mt-3 overflow-x-auto">{children}</div>
        </section>
    )
}

function SimpleTable({ columns, rows, emptyLabel }) {
    return (
        <table className="w-full border-collapse">
            <thead>
                <tr>
                    {columns.map((c) => (
                        <th
                            key={c}
                            className="text-left text-xs font-medium px-3 py-2 border-b"
                            style={{ color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' }}
                        >
                            {c}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr>
                        <td
                            colSpan={columns.length}
                            className="px-3 py-3 text-sm"
                            style={{ color: 'hsl(var(--muted-foreground))' }}
                        >
                            {emptyLabel}
                        </td>
                    </tr>
                ) : (
                    rows.map((row, idx) => (
                        <tr key={idx} className="border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                            {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))
                )}
            </tbody>
        </table>
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

    const upcomingAppointmentsRows = [
        ['—', '—', '—', 'No upcoming appointments'],
    ]
    const notificationRows = [
        ['—', '—', 'All caught up'],
    ]
    const paymentRows = [
        ['—', '—', '—', 'No recent payments'],
    ]

    const showProfilePrompt =
        !loading &&
        !error &&
        isProfileIncomplete(profile) &&
        Date.now() > (profilePromptSnoozedUntil || 0)

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                        Patient Dashboard
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Quick access to your patient profile and medical documents.
                    </p>
                </div>

                <button
                    onClick={load}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                    style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    disabled={loading}
                >
                    <RefreshCcw size={16} />
                    Refresh
                </button>
            </div>

            {error ? (
                <p className="text-sm" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
            ) : null}

            {showProfilePrompt ? (
                <div className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                >
                    <div>
                        <div className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                            Complete your profile
                        </div>
                        <div className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Add your personal details so we can serve you better.
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            to="/patient/profile"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                        >
                            Update profile
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    title="Account"
                    value={profile?.name || profile?.email || 'Profile'}
                    hint="View and update your details"
                    to="/patient/profile"
                />
                <StatCard
                    title="Reports"
                    value={reportsCount === null ? (loading ? '…' : '0') : String(reportsCount)}
                    hint="Upload and download documents"
                    to="/patient/reports"
                />
                <StatCard
                    title="History"
                    value={historyStatus === 'ok' ? 'Available' : '—'}
                    hint={historyHint}
                    to="/patient/history"
                />
                <StatCard
                    title="Prescriptions"
                    value={prescriptionsStatus === 'ok' ? 'Available' : '—'}
                    hint={prescriptionsHint}
                    to="/patient/prescriptions"
                />
            </div>

            <section className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Overview Tables</h2>
                        <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Snapshot views from other services (UI-only).
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <TableCard title="Upcoming Appointments">
                        <SimpleTable
                            columns={['Date', 'Doctor', 'Type', 'Status']}
                            rows={upcomingAppointmentsRows}
                            emptyLabel="No appointments"
                        />
                    </TableCard>

                    <TableCard title="Recent Notifications">
                        <SimpleTable
                            columns={['Time', 'Message', 'Status']}
                            rows={notificationRows}
                            emptyLabel="No notifications"
                        />
                    </TableCard>

                    <TableCard title="Recent Payments">
                        <SimpleTable
                            columns={['Date', 'Amount', 'Method', 'Status']}
                            rows={paymentRows}
                            emptyLabel="No payments"
                        />
                    </TableCard>
                </div>
            </section>

            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>At a Glance</h2>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Helpful widgets from other services (UI-only).
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <WidgetCard title="Upcoming Appointments" icon={<Calendar size={16} />}>
                        <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            No upcoming appointments.
                        </div>
                        <div className="mt-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Connect appointment-service to show your schedule here.
                        </div>
                    </WidgetCard>

                    <WidgetCard title="Notifications" icon={<Bell size={16} />}>
                        <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            You're all caught up.
                        </div>
                        <div className="mt-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Latest alerts from notification-service will appear here.
                        </div>
                    </WidgetCard>

                    <WidgetCard title="Payments" icon={<CreditCard size={16} />}>
                        <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            No recent payments.
                        </div>
                        <div className="mt-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Payment history from payment-service can be summarized here.
                        </div>
                    </WidgetCard>

                    <WidgetCard title="Telemedicine" icon={<Video size={16} />}>
                        <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Ready for your next virtual consultation.
                        </div>
                        <div className="mt-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Session links and upcoming calls can be shown from telemedicine-service.
                        </div>
                    </WidgetCard>
                </div>
            </section>
        </div>
    )
}

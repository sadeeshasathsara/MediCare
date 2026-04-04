import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getPatientHistory, getPatientPrescriptions, getPatientProfile, listPatientReports } from '@/features/patients/services/patientApi'
import { RefreshCcw } from 'lucide-react'

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

export default function PatientDashboard() {
    const { user } = useAuth()
    const userId = user?.id

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [profile, setProfile] = useState(null)
    const [reportsCount, setReportsCount] = useState(null)
    const [historyStatus, setHistoryStatus] = useState('unknown')
    const [prescriptionsStatus, setPrescriptionsStatus] = useState('unknown')

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

            <section className="rounded-xl border p-5" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Quick Links</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                        to="/patient/profile"
                        className="inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    >
                        Profile
                    </Link>
                    <Link
                        to="/patient/reports"
                        className="inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    >
                        Reports
                    </Link>
                    <Link
                        to="/patient/history"
                        className="inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    >
                        History
                    </Link>
                    <Link
                        to="/patient/prescriptions"
                        className="inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    >
                        Prescriptions
                    </Link>
                </div>
            </section>
        </div>
    )
}

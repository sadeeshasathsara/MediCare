import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getPatientHistory } from '@/features/patients/services/patientApi'
import { RefreshCcw } from 'lucide-react'

export default function PatientHistoryPage() {
    const { user } = useAuth()
    const userId = user?.id

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [data, setData] = useState(null)

    const canUse = useMemo(() => Boolean(userId), [userId])

    const load = async () => {
        if (!userId) return
        setLoading(true)
        setError('')
        try {
            const res = await getPatientHistory(userId)
            setData(res)
        } catch (e) {
            const status = e?.response?.status
            if (status === 503) {
                setError('History is not available yet in the backend (503).')
            } else {
                setError(e?.response?.data?.message || e?.message || 'Failed to load history')
            }
            setData(null)
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
                <h1 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>History</h1>
                <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Please log in to view your history.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                        History
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        View your patient history returned by the patient-service.
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

            {error && (
                <p className="text-sm" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
            )}

            <section className="rounded-xl border p-5" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                {loading ? (
                    <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Loading...</p>
                ) : data ? (
                    <pre className="text-xs whitespace-pre-wrap" style={{ color: 'hsl(var(--muted-foreground))' }}>{JSON.stringify(data, null, 2)}</pre>
                ) : (
                    <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>No data loaded.</p>
                )}
            </section>
        </div>
    )
}

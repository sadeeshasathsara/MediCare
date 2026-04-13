import { useEffect, useMemo, useState } from 'react'
import { adminDeletePatient, adminListPatients, adminSetPatientStatus } from '@/features/patients/services/patientApi'
import { CheckCircle2, XCircle, Trash2, RefreshCcw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminPatientsPage() {
    const [page, setPage] = useState(0)
    const [size] = useState(10)
    const [q, setQ] = useState('')
    const [status, setStatusFilter] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [data, setData] = useState({ items: [], page: 0, size: 10, total: 0 })

    const totalPages = useMemo(() => {
        const t = data?.total ?? 0
        return Math.max(1, Math.ceil(t / size))
    }, [data, size])

    const load = async (targetPage = page, overrides = {}) => {
        setLoading(true)
        setError('')
        try {
            const query = typeof overrides.q === 'string' ? overrides.q : q
            const statusValue = typeof overrides.status === 'string' ? overrides.status : status
            const res = await adminListPatients(targetPage, size, query.trim(), statusValue)
            setData(res)
            setPage(res.page)
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to load patients')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load(0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const setStatus = async (userId, status) => {
        setError('')
        try {
            await adminSetPatientStatus(userId, status)
            await load(page)
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to update status')
        }
    }

    const softDelete = async (userId) => {
        if (!confirm('Deactivate this patient?')) return
        setError('')
        try {
            await adminDeletePatient(userId)
            await load(page)
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to delete patient')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                        Patients
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Admin view of patient profiles and account status.
                    </p>
                </div>

                <button
                    onClick={() => load(page)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                    style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    disabled={loading}
                >
                    <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="rounded-xl border p-4" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                    <p className="text-sm" style={{ color: 'hsl(var(--destructive))' }}>
                        {error}
                    </p>
                </div>
            )}

            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    load(0)
                }}
                className="rounded-xl border p-4 flex flex-col lg:flex-row lg:items-center gap-3"
                style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
            >
                <div className="flex-1">
                    <label className="block text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Search
                    </label>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search by name, email, or user ID"
                        className="mt-1 w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                        style={{
                            backgroundColor: 'hsl(var(--input))',
                            borderColor: 'hsl(var(--border))',
                            color: 'hsl(var(--foreground))',
                        }}
                    />
                </div>

                <div className="w-full lg:w-56">
                    <label className="block text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Status
                    </label>
                    <select
                        value={status}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="mt-1 w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                        style={{
                            backgroundColor: 'hsl(var(--input))',
                            borderColor: 'hsl(var(--border))',
                            color: 'hsl(var(--foreground))',
                        }}
                    >
                        <option value="">All</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 lg:self-end">
                    <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                        disabled={loading}
                    >
                        Apply
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setQ('')
                            setStatusFilter('')
                            load(0, { q: '', status: '' })
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        disabled={loading}
                    >
                        Reset
                    </button>
                </div>
            </form>

            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                <div className="overflow-x-auto">
                    <table className="min-w-[720px] w-full text-sm">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                                <th className="text-left font-medium px-4 py-3" style={{ color: 'hsl(var(--muted-foreground))' }}>User ID</th>
                                <th className="text-left font-medium px-4 py-3" style={{ color: 'hsl(var(--muted-foreground))' }}>Email</th>
                                <th className="text-left font-medium px-4 py-3" style={{ color: 'hsl(var(--muted-foreground))' }}>Name</th>
                                <th className="text-left font-medium px-4 py-3" style={{ color: 'hsl(var(--muted-foreground))' }}>Status</th>
                                <th className="text-right font-medium px-4 py-3" style={{ color: 'hsl(var(--muted-foreground))' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: size }).map((_, idx) => (
                                    <tr key={`skeleton-${idx}`} className="border-b last:border-b-0" style={{ borderColor: 'hsl(var(--border))' }}>
                                        <td className="px-4 py-3">
                                            <Skeleton className="h-4 w-40" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <Skeleton className="h-4 w-56" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <Skeleton className="h-4 w-36" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <Skeleton className="h-6 w-24 rounded-full" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Skeleton className="h-8 w-20 rounded-lg" />
                                                <Skeleton className="h-8 w-24 rounded-lg" />
                                                <Skeleton className="h-8 w-9 rounded-lg" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : data.items.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                        No patients found.
                                    </td>
                                </tr>
                            ) : (
                                data.items.map((p) => (
                                    <tr key={p.userId} className="border-b last:border-b-0" style={{ borderColor: 'hsl(var(--border))' }}>
                                        <td className="px-4 py-3" style={{ color: 'hsl(var(--foreground))' }}>{p.userId}</td>
                                        <td className="px-4 py-3" style={{ color: 'hsl(var(--foreground))' }}>{p.email || '-'}</td>
                                        <td className="px-4 py-3" style={{ color: 'hsl(var(--foreground))' }}>{p.name || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                                                style={{
                                                    backgroundColor: p.status === 'ACTIVE' ? 'hsl(142 71% 45% / 0.12)' : 'hsl(var(--accent))',
                                                    color: p.status === 'ACTIVE' ? 'hsl(142 71% 45%)' : 'hsl(var(--accent-foreground))',
                                                }}
                                            >
                                                {p.status === 'ACTIVE' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                {p.status || 'UNKNOWN'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setStatus(p.userId, 'ACTIVE')}
                                                    className="px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
                                                    style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                                >
                                                    Activate
                                                </button>
                                                <button
                                                    onClick={() => setStatus(p.userId, 'INACTIVE')}
                                                    className="px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
                                                    style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                                >
                                                    Deactivate
                                                </button>
                                                <button
                                                    onClick={() => softDelete(p.userId)}
                                                    className="p-2 rounded-lg border transition-colors"
                                                    style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--destructive))' }}
                                                    title="Deactivate patient"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                    <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Page {page + 1} of {totalPages} · {data.total} total
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => load(Math.max(0, page - 1))}
                            className="px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
                            style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                            disabled={loading || page <= 0}
                        >
                            Prev
                        </button>
                        <button
                            onClick={() => load(Math.min(totalPages - 1, page + 1))}
                            className="px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
                            style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                            disabled={loading || page >= totalPages - 1}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '@/services/api'

export default function CreateAdminPage() {
    const [admins, setAdmins] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    const [modalOpen, setModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState('create') // create | edit
    const [activeAdmin, setActiveAdmin] = useState(null)

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const [submitting, setSubmitting] = useState(false)
    const [actingAdminId, setActingAdminId] = useState(null)

    const adminCount = useMemo(() => admins?.length || 0, [admins])

    const openCreate = () => {
        setModalMode('create')
        setActiveAdmin(null)
        setFullName('')
        setEmail('')
        setPassword('')
        setModalOpen(true)
        setError(null)
        setSuccess(null)
    }

    const openEdit = (admin) => {
        setModalMode('edit')
        setActiveAdmin(admin)
        setFullName(admin?.fullName || '')
        setEmail(admin?.email || '')
        setPassword('')
        setModalOpen(true)
        setError(null)
        setSuccess(null)
    }

    const closeModal = () => {
        setModalOpen(false)
    }

    const handleApiError = useCallback((err, fallbackMessage) => {
        const status = err?.response?.status
        const data = err?.response?.data

        const messageFromServer =
            (typeof data?.message === 'string' && data.message) ||
            (typeof data?.error === 'string' && data.error)

        if (!err?.response) {
            setError('Cannot reach the server. Make sure the API Gateway is running.')
        } else if (messageFromServer) {
            setError(messageFromServer)
        } else if (status === 403) {
            setError('Forbidden. Admin access required.')
        } else {
            setError(`${fallbackMessage}${status ? ` (HTTP ${status})` : ''}.`)
        }
    }, [])

    const loadAdmins = useCallback(async () => {
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const res = await api.get('/auth/admin/users')
            setAdmins(Array.isArray(res.data) ? res.data : [])
        } catch (err) {
            handleApiError(err, 'Failed to load admins')
        } finally {
            setLoading(false)
        }
    }, [handleApiError])

    useEffect(() => {
        loadAdmins()
    }, [loadAdmins])

    const submitModal = async (e) => {
        e.preventDefault()

        setSubmitting(true)
        setError(null)
        setSuccess(null)

        try {
            if (modalMode === 'create') {
                await api.post('/auth/admin/users', { fullName, email, password })
                setSuccess('Admin account created.')
                closeModal()
                await loadAdmins()
                return
            }

            const adminUserId = activeAdmin?.id
            if (!adminUserId) {
                setError('No admin selected.')
                return
            }

            await api.patch(`/auth/admin/users/${adminUserId}`, { fullName, email })
            setSuccess('Admin account updated.')
            closeModal()
            await loadAdmins()
        } catch (err) {
            const status = err?.response?.status
            const data = err?.response?.data
            const messageFromServer =
                (typeof data?.message === 'string' && data.message) ||
                (typeof data?.error === 'string' && data.error)

            if (!err?.response) {
                setError('Cannot reach the server. Make sure the API Gateway is running.')
            } else if (messageFromServer) {
                setError(messageFromServer)
            } else if (status === 409) {
                setError('Email already exists.')
            } else if (status === 403) {
                setError('Forbidden. Admin access required.')
            } else {
                setError(`${modalMode === 'create' ? 'Create admin failed' : 'Update admin failed'}${status ? ` (HTTP ${status})` : ''}.`)
            }
        } finally {
            setSubmitting(false)
        }
    }

    const setStatus = async (admin, status) => {
        const adminUserId = admin?.id
        if (!adminUserId) return

        setActingAdminId(adminUserId)
        setError(null)
        setSuccess(null)

        try {
            await api.patch(`/auth/admin/users/${adminUserId}/status`, { status })
            setSuccess(status === 'DISABLED' ? 'Admin suspended.' : 'Admin re-enabled.')
            await loadAdmins()
        } catch (err) {
            handleApiError(err, 'Failed to update status')
        } finally {
            setActingAdminId(null)
        }
    }

    const deleteAdmin = async (admin) => {
        const adminUserId = admin?.id
        if (!adminUserId) return

        const ok = window.confirm(`Delete admin account for ${admin?.email || 'this user'}?`)
        if (!ok) return

        setActingAdminId(adminUserId)
        setError(null)
        setSuccess(null)

        try {
            await api.delete(`/auth/admin/users/${adminUserId}`)
            setSuccess('Admin deleted.')
            await loadAdmins()
        } catch (err) {
            handleApiError(err, 'Delete failed')
        } finally {
            setActingAdminId(null)
        }
    }

    const formatDate = (value) => {
        if (!value) return '—'
        try {
            const date = new Date(value)
            if (Number.isNaN(date.getTime())) return '—'
            return date.toLocaleString()
        } catch {
            return '—'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                        Admin Accounts
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Manage admin access (create, edit, suspend, delete).
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={loading}
                        className="px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer"
                        style={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            color: 'hsl(var(--foreground))',
                            opacity: loading ? 0.7 : 1,
                        }}
                        onClick={loadAdmins}
                    >
                        {loading ? 'Refreshing…' : 'Refresh'}
                    </button>

                    <button
                        type="button"
                        className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all cursor-pointer"
                        style={{ backgroundColor: 'hsl(var(--primary))' }}
                        onClick={openCreate}
                    >
                        Create admin
                    </button>
                </div>
            </div>

            {error ? (
                <div
                    className="rounded-xl border px-4 py-3 text-sm"
                    style={{
                        borderColor: 'hsl(var(--border))',
                        backgroundColor: 'hsl(var(--accent))',
                        color: 'hsl(var(--foreground))',
                    }}
                >
                    {error}
                </div>
            ) : null}

            {success ? (
                <div
                    className="rounded-xl border px-4 py-3 text-sm"
                    style={{
                        borderColor: 'hsl(var(--border))',
                        backgroundColor: 'hsl(var(--secondary))',
                        color: 'hsl(var(--secondary-foreground))',
                    }}
                >
                    {success}
                </div>
            ) : null}

            <div
                className="rounded-xl border p-5"
                style={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                        Admin list
                    </h2>
                    <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {adminCount} admins
                    </span>
                </div>

                {admins.length === 0 ? (
                    <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        No admins found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-190">
                            <div
                                className="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium uppercase tracking-wide border-b"
                                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
                            >
                                <div className="col-span-3">Name</div>
                                <div className="col-span-3">Email</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-2">Created</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>

                            <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                                {admins.map((admin) => {
                                    const busy = actingAdminId === admin?.id
                                    const isDisabled = (admin?.status || '').toUpperCase() === 'DISABLED'

                                    return (
                                        <div key={admin.id} className="grid grid-cols-12 gap-3 px-3 py-3 items-center">
                                            <div className="col-span-3">
                                                <div className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                                                    {admin.fullName || '—'}
                                                </div>
                                            </div>

                                            <div className="col-span-3">
                                                <div className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                                                    {admin.email}
                                                </div>
                                            </div>

                                            <div className="col-span-2">
                                                <span
                                                    className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border"
                                                    style={{
                                                        borderColor: 'hsl(var(--border))',
                                                        backgroundColor: isDisabled ? 'hsl(var(--accent))' : 'hsl(var(--secondary))',
                                                        color: isDisabled ? 'hsl(var(--foreground))' : 'hsl(var(--secondary-foreground))',
                                                    }}
                                                >
                                                    {isDisabled ? 'Suspended' : 'Active'}
                                                </span>
                                            </div>

                                            <div className="col-span-2">
                                                <div className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                                    {formatDate(admin.createdAt)}
                                                </div>
                                            </div>

                                            <div className="col-span-2 flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    className="px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer"
                                                    style={{
                                                        backgroundColor: 'hsl(var(--card))',
                                                        borderColor: 'hsl(var(--border))',
                                                        color: 'hsl(var(--foreground))',
                                                        opacity: busy ? 0.7 : 1,
                                                    }}
                                                    onClick={() => openEdit(admin)}
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    className="px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer"
                                                    style={{
                                                        backgroundColor: 'hsl(var(--card))',
                                                        borderColor: 'hsl(var(--border))',
                                                        color: 'hsl(var(--foreground))',
                                                        opacity: busy ? 0.7 : 1,
                                                    }}
                                                    onClick={() => setStatus(admin, isDisabled ? 'ACTIVE' : 'DISABLED')}
                                                >
                                                    {busy ? 'Working…' : isDisabled ? 'Re-enable' : 'Suspend'}
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    className="px-3 py-2 rounded-xl text-xs font-medium text-white transition-all cursor-pointer"
                                                    style={{
                                                        backgroundColor: 'hsl(var(--destructive))',
                                                        opacity: busy ? 0.7 : 1,
                                                    }}
                                                    onClick={() => deleteAdmin(admin)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {modalOpen ? (
                <div className="fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 opacity-50"
                        style={{ backgroundColor: 'hsl(var(--foreground))' }}
                        onClick={closeModal}
                    />

                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div
                            className="w-full max-w-lg rounded-xl border p-5"
                            style={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                            }}
                        >
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                                        {modalMode === 'create' ? 'Create admin' : 'Edit admin'}
                                    </h3>
                                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                        {modalMode === 'create'
                                            ? 'Create a new admin account.'
                                            : 'Update admin name or email.'}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="px-3 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer"
                                    style={{
                                        backgroundColor: 'hsl(var(--card))',
                                        borderColor: 'hsl(var(--border))',
                                        color: 'hsl(var(--foreground))',
                                    }}
                                    onClick={closeModal}
                                >
                                    Close
                                </button>
                            </div>

                            <form onSubmit={submitModal} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                                        Full name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-xl text-sm"
                                        style={{
                                            backgroundColor: 'hsl(var(--input))',
                                            borderColor: 'hsl(var(--border))',
                                            color: 'hsl(var(--foreground))',
                                        }}
                                        placeholder="Admin name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-xl text-sm"
                                        style={{
                                            backgroundColor: 'hsl(var(--input))',
                                            borderColor: 'hsl(var(--border))',
                                            color: 'hsl(var(--foreground))',
                                        }}
                                        placeholder="admin2@medicare.com"
                                    />
                                </div>

                                {modalMode === 'create' ? (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 border rounded-xl text-sm"
                                            style={{
                                                backgroundColor: 'hsl(var(--input))',
                                                borderColor: 'hsl(var(--border))',
                                                color: 'hsl(var(--foreground))',
                                            }}
                                            placeholder="Create a password"
                                        />
                                    </div>
                                ) : null}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-medium text-white transition-all cursor-pointer"
                                    style={{ backgroundColor: 'hsl(var(--primary))', opacity: submitting ? 0.8 : 1 }}
                                >
                                    {submitting ? 'Saving…' : modalMode === 'create' ? 'Create admin' : 'Save changes'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

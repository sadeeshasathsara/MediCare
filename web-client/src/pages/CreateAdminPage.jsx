import { useState } from 'react'
import api from '@/services/api'

export default function CreateAdminPage() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            await api.post('/auth/admin/users', { fullName, email, password })
            setSuccess('Admin user created.')
            setFullName('')
            setEmail('')
            setPassword('')
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
                setError(`Create admin failed${status ? ` (HTTP ${status})` : ''}.`)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-xl">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                    Create Admin
                </h1>
                <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Create a new admin account (admin authorization required).
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-5" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                {error ? (
                    <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--foreground))' }}>
                        {error}
                    </div>
                ) : null}
                {success ? (
                    <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))' }}>
                        {success}
                    </div>
                ) : null}

                <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>Full name</label>
                    <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 border rounded-xl text-sm"
                        style={{ backgroundColor: 'hsl(var(--input))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        placeholder="Admin name"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 border rounded-xl text-sm"
                        style={{ backgroundColor: 'hsl(var(--input))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        placeholder="admin2@medicare.com"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>Password</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border rounded-xl text-sm"
                        style={{ backgroundColor: 'hsl(var(--input))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        placeholder="Create a password"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-medium text-white transition-all cursor-pointer"
                    style={{ backgroundColor: 'hsl(var(--primary))' }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                    {loading ? 'Creating…' : 'Create admin'}
                </button>
            </form>
        </div>
    )
}

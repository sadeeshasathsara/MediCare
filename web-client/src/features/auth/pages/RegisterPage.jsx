import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { HeartPulse, Lock, Mail, ArrowRight, Loader2, User as UserIcon, Stethoscope } from 'lucide-react'
import api from '@/services/api'

export default function RegisterPage() {
    const [role, setRole] = useState('PATIENT')
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const [licenseNumber, setLicenseNumber] = useState('')
    const [specialty, setSpecialty] = useState('')
    const [phone, setPhone] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    const navigate = useNavigate()

    const isDoctor = role === 'DOCTOR'
    const doctorProfile = useMemo(() => {
        if (!isDoctor) return null
        return {
            licenseNumber,
            specialty,
            phone,
        }
    }, [isDoctor, licenseNumber, specialty, phone])

    const handleRegister = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const payload = {
                email,
                password,
                role,
                fullName,
                ...(doctorProfile ? { doctorProfile } : {}),
            }

            await api.post('/auth/register', payload)

            const msg =
                role === 'DOCTOR'
                    ? 'Doctor account created. It must be verified by an admin before you can sign in.'
                    : 'Account created. You can now sign in.'

            setSuccess(msg)

            // Small UX: take them to login with the email prefilled.
            setTimeout(() => {
                navigate('/login', { state: { email } })
            }, 800)
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
            } else {
                setError(`Registration failed${status ? ` (HTTP ${status})` : ''}.`)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex" style={{ backgroundColor: 'hsl(var(--background))' }}>
            {/* Left side: Branding */}
            <div
                className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden"
                style={{ backgroundColor: 'hsl(var(--primary))' }}
            >
                <div className="absolute top-0 right-0 w-125 h-125 bg-white opacity-5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

                <div className="flex items-center gap-3 relative z-10">
                    <HeartPulse size={36} className="text-white" />
                    <span className="text-2xl font-bold text-white tracking-tight">MediCare</span>
                </div>

                <div className="space-y-6 relative z-10">
                    <h1 className="text-4xl leading-tight font-semibold text-white">
                        Create your account <br /> and get started
                    </h1>
                    <p className="text-primary-foreground/80 text-lg max-w-md">
                        Register as a patient or a doctor. Doctor accounts require admin verification.
                    </p>
                </div>

                <div className="text-sm text-primary-foreground/60 relative z-10">
                    © {new Date().getFullYear()} MediCare. All rights reserved.
                </div>
            </div>

            {/* Right side: Register form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                            Sign up
                        </h2>
                        <p className="mt-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            Choose an account type and fill in your details.
                        </p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-5">
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
                                    backgroundColor: 'hsl(var(--card))',
                                    color: 'hsl(var(--foreground))',
                                }}
                            >
                                {success}
                            </div>
                        ) : null}

                        {/* Role selector */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setRole('PATIENT')}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer"
                                style={{
                                    backgroundColor: role === 'PATIENT' ? 'hsl(var(--accent))' : 'hsl(var(--input))',
                                    borderColor: 'hsl(var(--border))',
                                    color: 'hsl(var(--foreground))',
                                }}
                            >
                                <UserIcon size={16} /> Patient
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('DOCTOR')}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer"
                                style={{
                                    backgroundColor: role === 'DOCTOR' ? 'hsl(var(--accent))' : 'hsl(var(--input))',
                                    borderColor: 'hsl(var(--border))',
                                    color: 'hsl(var(--foreground))',
                                }}
                            >
                                <Stethoscope size={16} /> Doctor
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                                    <UserIcon size={18} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition-colors focus:outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: 'hsl(var(--input))',
                                        borderColor: 'hsl(var(--border))',
                                        color: 'hsl(var(--foreground))',
                                    }}
                                    placeholder="Full name"
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                                    <Mail size={18} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition-colors focus:outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: 'hsl(var(--input))',
                                        borderColor: 'hsl(var(--border))',
                                        color: 'hsl(var(--foreground))',
                                    }}
                                    placeholder="name@medicare.com"
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                                    <Lock size={18} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition-colors focus:outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: 'hsl(var(--input))',
                                        borderColor: 'hsl(var(--border))',
                                        color: 'hsl(var(--foreground))',
                                    }}
                                    placeholder="Create a password"
                                />
                            </div>

                            {/* Doctor-only fields */}
                            {isDoctor ? (
                                <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
                                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                                        Doctor profile
                                    </p>

                                    <input
                                        type="text"
                                        required
                                        value={licenseNumber}
                                        onChange={(e) => setLicenseNumber(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-xl text-sm"
                                        style={{ backgroundColor: 'hsl(var(--input))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                        placeholder="License number"
                                    />
                                    <input
                                        type="text"
                                        required
                                        value={specialty}
                                        onChange={(e) => setSpecialty(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-xl text-sm"
                                        style={{ backgroundColor: 'hsl(var(--input))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                        placeholder="Specialty"
                                    />
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-xl text-sm"
                                        style={{ backgroundColor: 'hsl(var(--input))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                        placeholder="Phone"
                                    />
                                </div>
                            ) : null}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-white focus:outline-none transition-all cursor-pointer"
                            style={{ backgroundColor: 'hsl(var(--primary))' }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    Create account
                                    <ArrowRight size={18} className="absolute right-4 top-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-sm text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium hover:underline" style={{ color: 'hsl(var(--primary))' }}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

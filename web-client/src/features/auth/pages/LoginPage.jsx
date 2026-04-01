import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse, Lock, Mail, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/services/api'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@medicare.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await api.post('/auth/login', { email, password })
      const data = response.data

      const userProfile = {
        id: data?.user?.id,
        role: data?.user?.role,
        doctorVerified: data?.user?.doctorVerified,
        email,
        name: String(email || '').split('@')[0],
      }

      login({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: userProfile,
      })

      navigate('/')
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
      } else if (status === 401) {
        setError('Invalid email or password.')
      } else if (status === 429) {
        setError('Too many attempts. Please wait and try again.')
      } else {
        setError(`Login failed${status ? ` (HTTP ${status})` : ''}.`)
      }
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (type) => {
    if (type === 'patient') setEmail('patient@medicare.com')
    else if (type === 'doctor') setEmail('doctor@medicare.com')
    else setEmail('admin@medicare.com')
    setPassword('demo123')
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'hsl(var(--background))' }}>
      {/* Left side: Branding / Illustration */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden" style={{ backgroundColor: 'hsl(var(--primary))' }}>
        {/* Decorative background circle */}
        <div className="absolute top-0 right-0 w-125 h-125 bg-white opacity-5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

        <div className="flex items-center gap-3 relative z-10">
          <HeartPulse size={36} className="text-white" />
          <span className="text-2xl font-bold text-white tracking-tight">MediCare</span>
        </div>

        <div className="space-y-6 relative z-10">
          <h1 className="text-4xl leading-tight font-semibold text-white">
            Transforming Healthcare <br /> Management for Everyone
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Seamlessly connect patients, doctors, and administrators in one unified platform.
          </p>
        </div>

        <div className="text-sm text-primary-foreground/60 relative z-10">
          © {new Date().getFullYear()} MediSync System. All rights reserved.
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
              Welcome back
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Please enter your details to sign in
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
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
            <div className="space-y-4">
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; e.currentTarget.style.boxShadow = '0 0 0 2px hsl(var(--primary)/0.2)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.boxShadow = 'none' }}
                  placeholder="name@medicare.com"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Lock size={18} style={{ color: 'hsl(var(--muted-foreground))' }} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border rounded-xl text-sm transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'hsl(var(--input))',
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; e.currentTarget.style.boxShadow = '0 0 0 2px hsl(var(--primary)/0.2)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.boxShadow = 'none' }}
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium hover:underline" style={{ color: 'hsl(var(--primary))' }}>
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all cursor-pointer"
              style={{
                backgroundColor: 'hsl(var(--primary))',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} className="absolute right-4 top-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </button>
          </form>

          {/* Development helpers */}
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-xs text-center mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Test Accounts (Backend Auth)
            </p>
            <div className="flex justify-center gap-2">
              <button onClick={() => fillDemo('admin')} className="text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>Admin</button>
              <button onClick={() => fillDemo('doctor')} className="text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>Doctor</button>
              <button onClick={() => fillDemo('patient')} className="text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>Patient</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

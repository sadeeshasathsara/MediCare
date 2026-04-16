import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import PatientPaymentTab from '@/features/payments/components/PatientPaymentTab'

export default function PaymentsPage() {
    const { user } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    const [message, setMessage] = useState('')

    const appointmentId = location.state?.appointmentId || ''

    const initialDescription = useMemo(() => {
        if (location.state?.description) return location.state.description
        return appointmentId ? `Appointment payment (${appointmentId})` : 'Appointment payment'
    }, [appointmentId, location.state?.description])

    const isPatient = user?.role === 'PATIENT'

    if (!isPatient) {
        return (
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                    Payments
                </h1>
                <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Payments are available for patient booking flow.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                    Complete Payment
                </h1>
                <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Finish payment for your appointment, then you will be redirected back.
                </p>
                {appointmentId ? (
                    <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Appointment ID: {appointmentId}
                    </p>
                ) : null}
                {message ? (
                    <p className="text-sm text-primary">{message}</p>
                ) : null}
            </div>

            <PatientPaymentTab
                user={user}
                userId={user?.id}
                initialDescription={initialDescription}
                onPaymentSuccess={async () => {
                    setMessage('Payment successful. Redirecting to profile payment history...')
                    window.alert('Payment successful!')
                    navigate('/patient/profile', {
                        replace: true,
                        state: { activeTab: 'payments', paymentSuccess: true },
                    })
                }}
            />
        </div>
    )
}

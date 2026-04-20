import { useEffect, useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { CircleDollarSign, Loader2, ReceiptText } from 'lucide-react'
import { confirmPayment, createPaymentIntent, listUserPayments } from '@/features/payments/services/paymentApi'
import { useTheme } from '@/context/ThemeContext'

function formatAmount(amount, currency) {
    if (amount == null) return '-'
    const code = (currency || 'usd').toUpperCase()
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount / 100)
    } catch {
        return `${(amount / 100).toFixed(2)} ${code}`
    }
}

function formatDisplayMoney(amount, currency) {
    const value = Number(amount)
    if (!Number.isFinite(value)) return '-'
    const code = (currency || 'usd').toUpperCase()
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(value)
    } catch {
        return `${value.toFixed(2)} ${code}`
    }
}

function PaymentForm({ user, userId, paymentIntentId, onPaid, busy, setBusy, setError }) {
    const stripe = useStripe()
    const elements = useElements()

    const handleConfirm = async (e) => {
        e.preventDefault()
        if (!stripe || !elements || busy) return

        setBusy(true)
        setError('')

        try {
            const result = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    payment_method_data: {
                        billing_details: {
                            name: user?.name || undefined,
                            email: user?.email || undefined,
                        },
                    },
                    return_url: window.location.href,
                },
                redirect: 'if_required',
            })

            if (result.error) {
                throw new Error(result.error.message || 'Card payment failed')
            }

            if (result.paymentIntent?.status !== 'succeeded') {
                throw new Error('Payment was not completed. Please try again.')
            }

            await confirmPayment(userId, { paymentIntentId: paymentIntentId || result.paymentIntent.id })
            await onPaid()
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Payment failed')
        } finally {
            setBusy(false)
        }
    }

    return (
        <form onSubmit={handleConfirm} className="space-y-3">
            <div className="rounded-lg border border-border bg-input px-3 py-3">
                <PaymentElement />
            </div>
            <p className="text-xs text-muted-foreground">
                Demo (Stripe test mode): use card <span className="font-medium">4242 4242 4242 4242</span>, any future expiry, any CVC.
            </p>
            <button
                type="submit"
                disabled={!stripe || busy}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <CircleDollarSign size={14} />}
                Pay Now
            </button>
        </form>
    )
}

export default function PatientPaymentTab({
    user,
    userId,
    historyOnly = false,
    showSavedRecords = true,
    editableDetails = true,
    initialAmount = '',
    initialCurrency = 'usd',
    initialDescription = 'Consultation payment',
    onPaymentSuccess,
}) {
    const { theme } = useTheme()

    const [amount, setAmount] = useState(initialAmount)
    const [currency, setCurrency] = useState(initialCurrency)
    const [description, setDescription] = useState(initialDescription)

    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const [clientSecret, setClientSecret] = useState('')
    const [paymentIntentId, setPaymentIntentId] = useState('')
    const [stripePromise, setStripePromise] = useState(null)

    const canPay = useMemo(() => Number(amount) > 0, [amount])

    const elementsOptions = useMemo(() => {
        if (!clientSecret) return null
        return {
            clientSecret,
            appearance: {
                theme: theme === 'dark' ? 'night' : 'stripe',
            },
        }
    }, [clientSecret, theme])

    const loadPayments = async () => {
        if (!showSavedRecords) return
        if (!userId) return
        setLoading(true)
        try {
            const data = await listUserPayments(userId)
            setPayments(Array.isArray(data) ? data : [])
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Failed to load payments')
        } finally {
            setLoading(false)
        }
    }

    const startPayment = async (e) => {
        e.preventDefault()
        if (!userId || !canPay || busy) return

        setBusy(true)
        setError('')
        try {
            const payload = {
                amount: Math.round(Number(amount) * 100),
                currency,
                description,
            }
            const res = await createPaymentIntent(userId, payload)
            if (!res?.clientSecret) throw new Error('Unable to start payment')
            if (!res?.publishableKey) throw new Error('Stripe publishable key is missing on server')

            setClientSecret(res.clientSecret)
            setPaymentIntentId(res.paymentIntentId || '')
            setStripePromise(loadStripe(res.publishableKey))
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Unable to start payment')
        } finally {
            setBusy(false)
        }
    }

    const handlePaid = async () => {
        setClientSecret('')
        setPaymentIntentId('')
        if (editableDetails) {
            setAmount('')
        }
        if (showSavedRecords) {
            await loadPayments()
        }
        if (typeof onPaymentSuccess === 'function') {
            await onPaymentSuccess()
        }
    }

    useEffect(() => {
        if (showSavedRecords) {
            loadPayments()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, showSavedRecords])

    return (
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <CircleDollarSign size={16} className="text-muted-foreground" />
                    <h2 className="text-base font-semibold text-foreground">
                        {historyOnly ? 'Payment History' : 'Payment Method (Stripe)'}
                    </h2>
                </div>
                {showSavedRecords ? (
                    <button
                        type="button"
                        onClick={loadPayments}
                        disabled={loading || busy}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground disabled:opacity-60"
                    >
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <ReceiptText size={12} />}
                        Refresh
                    </button>
                ) : null}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {!historyOnly ? (
                <>
                    {editableDetails ? (
                        <form onSubmit={startPayment} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <label className="space-y-1 md:col-span-1">
                                <span className="text-xs font-medium text-muted-foreground">Amount</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus-visible:border-primary"
                                    placeholder="100.00"
                                />
                            </label>

                            <label className="space-y-1 md:col-span-1">
                                <span className="text-xs font-medium text-muted-foreground">Currency</span>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus-visible:border-primary"
                                >
                                    <option value="usd">USD</option>
                                    <option value="lkr">LKR</option>
                                </select>
                            </label>

                            <label className="space-y-1 md:col-span-2">
                                <span className="text-xs font-medium text-muted-foreground">Description</span>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus-visible:border-primary"
                                    placeholder="Consultation payment"
                                />
                            </label>

                            <div className="md:col-span-4">
                                <button
                                    type="submit"
                                    disabled={!canPay || busy}
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                                >
                                    {busy ? <Loader2 size={14} className="animate-spin" /> : <CircleDollarSign size={14} />}
                                    Continue to Payment
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-foreground">Amount</p>
                                <p className="text-sm text-foreground">{formatDisplayMoney(amount, currency)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Description</p>
                                <p className="text-sm text-foreground">{description || '-'}</p>
                            </div>
                            <div>
                                <button
                                    type="button"
                                    onClick={startPayment}
                                    disabled={!canPay || busy}
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                                >
                                    {busy ? <Loader2 size={14} className="animate-spin" /> : <CircleDollarSign size={14} />}
                                    Continue to Payment
                                </button>
                            </div>
                        </div>
                    )}

                    {clientSecret && stripePromise ? (
                        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                            <p className="text-sm text-muted-foreground">Choose a payment method and complete the payment.</p>
                            {elementsOptions ? (
                                <Elements key={`${theme}-${clientSecret}`} stripe={stripePromise} options={elementsOptions}>
                                    <PaymentForm
                                        user={user}
                                        userId={userId}
                                        clientSecret={clientSecret}
                                        paymentIntentId={paymentIntentId}
                                        onPaid={handlePaid}
                                        busy={busy}
                                        setBusy={setBusy}
                                        setError={setError}
                                    />
                                </Elements>
                            ) : null}
                        </div>
                    ) : null}
                </>
            ) : null}

            {showSavedRecords ? (
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Saved Payment Records</h3>
                    {payments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No payment records yet. Click Refresh to load history.</p>
                    ) : (
                        <div className="space-y-2">
                            {payments.map((payment) => (
                                <div key={payment.id} className="rounded-lg border border-border bg-background p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-medium text-foreground">
                                            {formatAmount(payment.amount, payment.currency)}
                                        </p>
                                        <span className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                                            {payment.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{payment.description || 'No description'}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {payment.cardBrand && payment.cardLast4
                                            ? `${payment.cardBrand.toUpperCase()} ending in ${payment.cardLast4}`
                                            : 'Card details unavailable'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '-'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}
        </section>
    )
}

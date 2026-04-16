import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
    downloadPatientProfilePhoto,
    getPatientProfile,
    removePatientProfilePhoto,
    updatePatientProfile,
    uploadPatientProfilePhoto,
} from '@/features/patients/services/patientApi'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import {
    Save,
    Camera,
    Trash2,
    User,
    Mail,
    Calendar,
    Phone,
    MapPin,
    CreditCard,
} from 'lucide-react'
import PatientPaymentTab from '@/features/payments/components/PatientPaymentTab'

function emptyProfile(userId, email) {
    return {
        userId,
        email: email || '',
        name: '',
        dob: '',
        contact: { phone: '' },
        address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: '' },
    }
}

export default function PatientProfilePage() {
    const { user } = useAuth()
    const location = useLocation()
    const userId = user?.id
    const userEmail = user?.email

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [photoLoading, setPhotoLoading] = useState(false)
    const [photoSaving, setPhotoSaving] = useState(false)
    const [error, setError] = useState('')
    const [profile, setProfile] = useState(null)
    const [photoUrl, setPhotoUrl] = useState('')
    const [activeTab, setActiveTab] = useState('profile')
    const [paymentNotice, setPaymentNotice] = useState('')

    const [phoneValue, setPhoneValue] = useState('')

    const fileInputRef = useRef(null)

    const canUse = useMemo(() => Boolean(userId), [userId])

    const load = async () => {
        if (!userId) return
        setLoading(true)
        setError('')
        try {
            const data = await getPatientProfile(userId)
            const base = emptyProfile(userId, userEmail)
            setProfile({
                ...base,
                ...data,
                // Keep email visible even if patient-service doesn't store it.
                email: data?.email || userEmail || '',
                contact: { ...base.contact, ...(data?.contact || {}) },
                address: { ...base.address, ...(data?.address || {}) },
            })

            setPhoneValue(data?.contact?.phone || '')

            if (data?.hasProfilePhoto) {
                setPhotoLoading(true)
                try {
                    const res = await downloadPatientProfilePhoto(userId)
                    const url = URL.createObjectURL(res.data)
                    setPhotoUrl(url)
                } catch {
                    setPhotoUrl('')
                } finally {
                    setPhotoLoading(false)
                }
            } else {
                setPhotoUrl('')
            }
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to load profile')
            setProfile(emptyProfile(userId, userEmail))
            setPhotoUrl('')

            setPhoneValue('')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    useEffect(() => {
        return () => {
            if (photoUrl) URL.revokeObjectURL(photoUrl)
        }
    }, [photoUrl])

    useEffect(() => {
        const nextTab = location.state?.activeTab
        if (nextTab === 'payments' || nextTab === 'profile') {
            setActiveTab(nextTab)
        }

        if (location.state?.paymentSuccess) {
            setPaymentNotice('Payment successful. Your payment history is updated below.')
        }
    }, [location.state])

    const uploadPhoto = async (file) => {
        if (!userId || !file) return
        setPhotoSaving(true)
        setError('')
        try {
            await uploadPatientProfilePhoto(userId, file)
            await load()
            window.dispatchEvent(new Event('profile-photo-updated'))
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to upload profile photo')
        } finally {
            setPhotoSaving(false)
        }
    }

    const removePhoto = async () => {
        if (!userId) return
        setPhotoSaving(true)
        setError('')
        try {
            await removePatientProfilePhoto(userId)
            await load()
            window.dispatchEvent(new Event('profile-photo-updated'))
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to remove profile photo')
        } finally {
            setPhotoSaving(false)
        }
    }

    const updateField = (path, value) => {
        setProfile((prev) => {
            const next = { ...(prev || emptyProfile(userId, userEmail)) }
            if (path.startsWith('contact.')) {
                next.contact = { ...(next.contact || {}) }
                next.contact[path.replace('contact.', '')] = value
                return next
            }
            if (path.startsWith('address.')) {
                next.address = { ...(next.address || {}) }
                next.address[path.replace('address.', '')] = value
                return next
            }
            next[path] = value
            return next
        })
    }

    const save = async () => {
        if (!userId) return

        if (phoneValue && !isValidPhoneNumber(phoneValue)) {
            setError('Please enter a valid phone number.')
            return
        }

        setSaving(true)
        setError('')
        try {
            const payload = {
                // Keep email as a mirror field only; login email is auth-service owned.
                email: profile?.email || userEmail || '',
                name: profile?.name || '',
                dob: profile?.dob || '',
                contact: { phone: phoneValue || '' },
                address: {
                    line1: profile?.address?.line1 || '',
                    line2: profile?.address?.line2 || '',
                    city: profile?.address?.city || '',
                    state: profile?.address?.state || '',
                    postalCode: profile?.address?.postalCode || '',
                    country: profile?.address?.country || '',
                },
            }
            const saved = await updatePatientProfile(userId, payload)
            const base = emptyProfile(userId, saved?.email || userEmail)
            setProfile({
                ...base,
                ...saved,
                email: saved?.email || userEmail || '',
                contact: { ...base.contact, ...(saved?.contact || {}) },
                address: { ...base.address, ...(saved?.address || {}) },
            })
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to save profile')
        } finally {
            setSaving(false)
        }
    }

    if (!canUse) {
        return (
            <div className="rounded-xl border border-border bg-card p-6">
                <h1 className="text-lg font-semibold text-foreground">My Profile</h1>
                <p className="text-sm mt-1 text-muted-foreground">Please log in to view your profile.</p>
            </div>
        )
    }

    const initials = (profile?.name || userEmail || 'U').trim().slice(0, 1).toUpperCase()

    const phoneIsValid = !phoneValue || isValidPhoneNumber(phoneValue)
    const phoneHelper = phoneValue
        ? phoneIsValid
            ? `Will be saved as ${phoneValue}`
            : 'Enter a valid phone number.'
        : 'Optional. Add your phone number.'

    return (
        <div className="space-y-6">
            {/* Header + Avatar (top-center) */}
            <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
                <div className="h-28 w-full bg-linear-to-b from-primary/15 to-background" />

                <div className="px-5 pb-5">
                    <div className="-mt-10 flex flex-col items-center text-center">
                        <div className="relative group">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={loading || photoSaving}
                                onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    e.target.value = ''
                                    if (f) uploadPhoto(f)
                                }}
                            />

                            <div className="h-24 w-24 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center">
                                {photoUrl ? (
                                    <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-semibold text-muted-foreground">{initials}</span>
                                )}

                                {/* Hover overlay + centered bin icon (photo only) */}
                                {photoUrl ? (
                                    <div
                                        className={
                                            'absolute inset-0 rounded-full bg-foreground/25 opacity-0 ' +
                                            'group-hover:opacity-100 transition-opacity pointer-events-none'
                                        }
                                    />
                                ) : null}
                            </div>

                            {/* Hover-only bin icon (centered) to remove */}
                            {photoUrl ? (
                                <button
                                    type="button"
                                    onClick={removePhoto}
                                    disabled={loading || photoSaving}
                                    className={
                                        'absolute inset-0 rounded-full flex items-center justify-center ' +
                                        'opacity-0 group-hover:opacity-100 transition-opacity ' +
                                        'disabled:opacity-40'
                                    }
                                    title="Remove profile photo"
                                >
                                    <span className="h-10 w-10 rounded-full border border-border bg-background/90 flex items-center justify-center text-destructive hover:bg-accent">
                                        <Trash2 size={16} />
                                    </span>
                                </button>
                            ) : null}

                            {/* Camera icon = upload trigger */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading || photoSaving}
                                className={
                                    'absolute -bottom-1 -right-1 h-9 w-9 rounded-full border border-border bg-background ' +
                                    'flex items-center justify-center text-muted-foreground transition-colors ' +
                                    'hover:bg-accent hover:text-accent-foreground disabled:opacity-50'
                                }
                                title={photoUrl ? 'Change profile photo' : 'Upload profile photo'}
                            >
                                <Camera size={16} />
                            </button>
                        </div>

                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">My Profile</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage your patient account details.</p>

                        <div className="mt-4" />

                        <p className="mt-2 text-xs text-muted-foreground">
                            {photoLoading ? 'Loading photo…' : photoUrl ? 'Photo uploaded' : 'No photo uploaded'}
                        </p>
                    </div>
                </div>
            </section>

            {error && (
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            {paymentNotice && (
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-sm text-primary">{paymentNotice}</p>
                </div>
            )}

            <div className="inline-flex rounded-lg border border-border bg-card p-1">
                <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className={
                        `inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ` +
                        (activeTab === 'profile'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')
                    }
                >
                    <User size={14} />
                    Profile Details
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('payments')}
                    className={
                        `inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ` +
                        (activeTab === 'payments'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')
                    }
                >
                    <CreditCard size={14} />
                    Payments
                </button>
            </div>

            {activeTab === 'profile' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <section className="rounded-xl border border-border bg-card p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <User size={16} className="text-muted-foreground" />
                                <h2 className="text-base font-semibold text-foreground">Personal Info</h2>
                            </div>

                            <button
                                type="button"
                                onClick={save}
                                disabled={saving || loading || !phoneIsValid}
                                className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
                                title="Save"
                            >
                                <Save size={16} className={saving ? 'animate-pulse' : ''} />
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3">
                            <Field
                                icon={Mail}
                                label="Email"
                                value={profile?.email || ''}
                                onChange={(v) => updateField('email', v)}
                                disabled={true}
                                helper="Email is managed by the authentication service."
                            />
                            <Field
                                icon={User}
                                label="Name"
                                value={profile?.name || ''}
                                onChange={(v) => updateField('name', v)}
                                disabled={loading}
                            />
                            <Field
                                icon={Calendar}
                                label="Date of Birth"
                                type="date"
                                value={profile?.dob || ''}
                                onChange={(v) => updateField('dob', v)}
                                disabled={loading}
                            />
                            <PhoneField
                                label="Phone"
                                icon={Phone}
                                value={phoneValue || ''}
                                onChange={(v) => {
                                    setPhoneValue(v || '')
                                    updateField('contact.phone', v || '')
                                }}
                                disabled={loading}
                                helper={phoneHelper}
                                invalid={!phoneIsValid}
                            />
                        </div>
                    </section>

                    <section className="rounded-xl border border-border bg-card p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <MapPin size={16} className="text-muted-foreground" />
                                <h2 className="text-base font-semibold text-foreground">Address</h2>
                            </div>

                            <button
                                type="button"
                                onClick={save}
                                disabled={saving || loading || !phoneIsValid}
                                className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
                                title="Save"
                            >
                                <Save size={16} className={saving ? 'animate-pulse' : ''} />
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3">
                            <Field label="Line 1" value={profile?.address?.line1 || ''} onChange={(v) => updateField('address.line1', v)} disabled={loading} />
                            <Field label="Line 2" value={profile?.address?.line2 || ''} onChange={(v) => updateField('address.line2', v)} disabled={loading} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Field label="City" value={profile?.address?.city || ''} onChange={(v) => updateField('address.city', v)} disabled={loading} />
                                <Field label="State" value={profile?.address?.state || ''} onChange={(v) => updateField('address.state', v)} disabled={loading} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Field label="Postal Code" value={profile?.address?.postalCode || ''} onChange={(v) => updateField('address.postalCode', v)} disabled={loading} />
                                <Field label="Country" value={profile?.address?.country || ''} onChange={(v) => updateField('address.country', v)} disabled={loading} />
                            </div>
                        </div>
                    </section>
                </div>
            ) : (
                <PatientPaymentTab user={user} userId={userId} historyOnly />
            )}
        </div>
    )
}

function Field({ label, value, onChange, disabled, placeholder, helper, icon: Icon, type = 'text', inputMode }) {
    return (
        <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <div className="relative">
                {Icon ? (
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                        <Icon size={16} className="text-muted-foreground" />
                    </div>
                ) : null}
                <input
                    type={type}
                    value={value}
                    disabled={disabled}
                    placeholder={placeholder}
                    inputMode={inputMode}
                    onChange={(e) => onChange(e.target.value)}
                    className={
                        `w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none ` +
                        `placeholder:text-muted-foreground/70 disabled:opacity-60 ` +
                        `focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 ` +
                        (Icon ? 'pl-10' : '')
                    }
                />
            </div>
            {helper ? <span className="block text-xs text-muted-foreground">{helper}</span> : null}
        </label>
    )
}

function PhoneField({ label, icon: Icon, value, onChange, disabled, helper, invalid }) {
    return (
        <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <div className="relative">
                {Icon ? (
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                        <Icon size={16} className="text-muted-foreground" />
                    </div>
                ) : null}

                <PhoneInput
                    international
                    countryCallingCodeEditable={false}
                    defaultCountry="US"
                    value={value || undefined}
                    onChange={onChange}
                    disabled={disabled}
                    className={(Icon ? 'pl-10 ' : '') + 'w-full'}
                    countrySelectProps={{
                        className:
                            'h-full rounded-lg border border-border bg-input px-2 py-2.5 text-sm text-foreground outline-none disabled:opacity-60',
                        'aria-label': 'Country',
                    }}
                    numberInputProps={{
                        className:
                            `w-full rounded-lg border bg-input px-3 py-2.5 text-sm text-foreground outline-none ` +
                            `placeholder:text-muted-foreground/70 disabled:opacity-60 ` +
                            `focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 ` +
                            (invalid ? 'border-destructive' : 'border-border'),
                        placeholder: 'Phone number',
                    }}
                />
            </div>
            {helper ? (
                <span className={`block text-xs ${invalid ? 'text-destructive' : 'text-muted-foreground'}`}>{helper}</span>
            ) : null}
        </label>
    )
}

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { downloadPatientProfilePhoto, getPatientProfile, removePatientProfilePhoto, updatePatientProfile, uploadPatientProfilePhoto } from '@/features/patients/services/patientApi'
import { Save, RefreshCcw, Camera, Trash2 } from 'lucide-react'

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
    const userId = user?.id
    const userEmail = user?.email

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [photoLoading, setPhotoLoading] = useState(false)
    const [photoSaving, setPhotoSaving] = useState(false)
    const [error, setError] = useState('')
    const [profile, setProfile] = useState(null)
    const [photoUrl, setPhotoUrl] = useState('')

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

    const uploadPhoto = async (file) => {
        if (!userId || !file) return
        setPhotoSaving(true)
        setError('')
        try {
            await uploadPatientProfilePhoto(userId, file)
            await load()
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
        setSaving(true)
        setError('')
        try {
            const payload = {
                // Keep email as a mirror field only; login email is auth-service owned.
                email: profile?.email || userEmail || '',
                name: profile?.name || '',
                dob: profile?.dob || '',
                contact: { phone: profile?.contact?.phone || '' },
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
            <div className="rounded-xl border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                <h1 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>My Profile</h1>
                <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Please log in to view your profile.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                        My Profile
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Manage your patient account details.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        disabled={loading}
                    >
                        <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                        Reload
                    </button>
                    <button
                        onClick={save}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                        disabled={saving || loading}
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border p-4" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                    <p className="text-sm" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="rounded-xl border p-5" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                    <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Personal Info</h2>

                    <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="h-14 w-14 rounded-full border overflow-hidden flex items-center justify-center"
                                style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--muted))' }}
                            >
                                {photoUrl ? (
                                    <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <Camera size={18} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                )}
                            </div>
                            <div>
                                <div className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>Profile Photo</div>
                                <div className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                    {photoLoading ? 'Loading...' : photoUrl ? 'Uploaded' : 'Not set'}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <label
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer"
                                style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                            >
                                <input
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
                                {photoUrl ? 'Replace' : 'Upload'}
                            </label>

                            <button
                                onClick={removePhoto}
                                className="inline-flex items-center justify-center p-2 rounded-lg border transition-colors"
                                style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--destructive))' }}
                                disabled={!photoUrl || loading || photoSaving}
                                title="Remove profile photo"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3">
                        <Field label="Email" value={profile?.email || ''} onChange={(v) => updateField('email', v)} disabled={true} helper="Email is managed by the authentication service." />
                        <Field label="Name" value={profile?.name || ''} onChange={(v) => updateField('name', v)} disabled={loading} />
                        <Field label="Date of Birth" placeholder="YYYY-MM-DD" value={profile?.dob || ''} onChange={(v) => updateField('dob', v)} disabled={loading} />
                        <Field label="Phone" value={profile?.contact?.phone || ''} onChange={(v) => updateField('contact.phone', v)} disabled={loading} />
                    </div>
                </section>

                <section className="rounded-xl border p-5" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                    <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Address</h2>
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
        </div>
    )
}

function Field({ label, value, onChange, disabled, placeholder, helper }) {
    return (
        <label className="space-y-1">
            <span className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</span>
            <input
                value={value}
                disabled={disabled}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                style={{
                    backgroundColor: 'hsl(var(--input))',
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                }}
                onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'hsl(var(--primary))'
                    e.currentTarget.style.boxShadow = '0 0 0 2px hsl(var(--primary) / 0.2)'
                }}
                onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'hsl(var(--border))'
                    e.currentTarget.style.boxShadow = 'none'
                }}
            />
            {helper ? (
                <span className="block text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{helper}</span>
            ) : null}
        </label>
    )
}

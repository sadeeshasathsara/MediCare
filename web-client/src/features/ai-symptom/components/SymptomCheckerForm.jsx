import { useState } from 'react'
import {
  Loader2,
  Sparkles,
  AlertCircle,
  Thermometer,
  CalendarDays,
  UserRound,
  ClipboardList,
  RotateCcw,
  ChevronDown,
  Info,
} from 'lucide-react'

const INITIAL_FORM = {
  symptoms: '',
  age: '',
  gender: '',
  medicalHistory: '',
}

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

/* ── Shared field wrapper styles ──────────────────────────── */

const fieldCardStyle = {
  borderRadius: '0.75rem',
  border: '1px solid hsl(var(--border))',
  backgroundColor: 'hsl(var(--background) / 0.5)',
  padding: '14px 16px',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

const fieldCardFocusStyle = {
  borderColor: 'hsl(var(--primary) / 0.5)',
  boxShadow: '0 0 0 3px hsl(var(--primary) / 0.08)',
}

const labelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'hsl(var(--foreground))',
  marginBottom: 8,
  letterSpacing: '-0.01em',
}

const labelIconStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: 6,
  backgroundColor: 'hsl(var(--primary) / 0.1)',
  color: 'hsl(var(--primary))',
  flexShrink: 0,
}

const inputBaseStyle = {
  width: '100%',
  backgroundColor: 'transparent',
  border: 'none',
  outline: 'none',
  fontSize: '0.875rem',
  lineHeight: 1.6,
  color: 'hsl(var(--foreground))',
  resize: 'vertical',
}

const helperStyle = {
  fontSize: '0.7rem',
  color: 'hsl(var(--muted-foreground))',
  marginTop: 6,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}

/* ── Component ────────────────────────────────────────────── */

export default function SymptomCheckerForm({ loading, error, onSubmit }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [validationError, setValidationError] = useState('')
  const [focusedField, setFocusedField] = useState(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const validate = () => {
    if (!form.symptoms.trim()) {
      return 'Please describe your symptoms before checking.'
    }

    if (form.age.trim()) {
      const parsed = Number(form.age)
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 120) {
        return 'Age must be a number between 0 and 120.'
      }
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setValidationError('')

    const nextValidationError = validate()
    if (nextValidationError) {
      setValidationError(nextValidationError)
      return
    }

    const payload = {
      symptoms: form.symptoms.trim(),
      age: form.age.trim() ? Number(form.age) : undefined,
      gender: form.gender.trim() || undefined,
      medicalHistory: form.medicalHistory.trim() || undefined,
    }

    await onSubmit(payload)
  }

  const handleReset = () => {
    setForm(INITIAL_FORM)
    setValidationError('')
  }

  const isFilled = form.symptoms.trim().length > 0
  const displayError = validationError || error

  return (
    <section
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
    >
      {/* ── Accent top bar ─────────────────────────────── */}
      <div
        style={{
          height: 3,
          background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.3))',
        }}
      />

      {/* ── Form header ────────────────────────────────── */}
      <div
        style={{
          padding: '18px 24px 14px',
          borderBottom: '1px solid hsl(var(--border) / 0.6)',
          background: 'linear-gradient(180deg, hsl(var(--primary) / 0.03) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
              color: 'hsl(var(--primary-foreground))',
              flexShrink: 0,
            }}
          >
            <ClipboardList size={17} />
          </div>
          <div>
            <h2
              style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: 'hsl(var(--foreground))',
                letterSpacing: '-0.01em',
                lineHeight: 1.3,
              }}
            >
              Describe Your Symptoms
            </h2>
            <p style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', marginTop: 1 }}>
              Fill in the details below for an AI-powered triage assessment
            </p>
          </div>
        </div>
      </div>

      {/* ── Form body ──────────────────────────────────── */}
      <form
        style={{ padding: '20px 24px 24px' }}
        onSubmit={handleSubmit}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Symptoms ────────────────────────────────── */}
          <div
            style={{
              ...fieldCardStyle,
              ...(focusedField === 'symptoms' ? fieldCardFocusStyle : {}),
            }}
          >
            <label style={labelStyle} htmlFor="symptoms">
              <span style={labelIconStyle}>
                <Thermometer size={13} />
              </span>
              Symptoms
              <span style={{ color: 'hsl(var(--destructive))', fontSize: '0.75rem', marginLeft: -2 }}>*</span>
            </label>
            <textarea
              id="symptoms"
              name="symptoms"
              rows={4}
              value={form.symptoms}
              onChange={handleChange}
              onFocus={() => setFocusedField('symptoms')}
              onBlur={() => setFocusedField(null)}
              placeholder="Describe what you're feeling — e.g. fever for 2 days, sore throat, dry cough, body aches..."
              style={{
                ...inputBaseStyle,
                minHeight: 90,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={helperStyle}>
                <Info size={10} />
                Be as specific as possible for better results
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: form.symptoms.length > 500
                    ? 'hsl(var(--destructive))'
                    : 'hsl(var(--muted-foreground))',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {form.symptoms.length} / 1000
              </span>
            </div>
          </div>

          {/* ── Age & Gender row ────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Age */}
            <div
              style={{
                ...fieldCardStyle,
                ...(focusedField === 'age' ? fieldCardFocusStyle : {}),
              }}
            >
              <label style={labelStyle} htmlFor="age">
                <span style={labelIconStyle}>
                  <CalendarDays size={13} />
                </span>
                Age
              </label>
              <input
                id="age"
                name="age"
                type="number"
                min="0"
                max="120"
                value={form.age}
                onChange={handleChange}
                onFocus={() => setFocusedField('age')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your age"
                style={inputBaseStyle}
              />
              <span style={helperStyle}>
                <Info size={10} />
                Helps determine age-specific risks
              </span>
            </div>

            {/* Gender */}
            <div
              style={{
                ...fieldCardStyle,
                ...(focusedField === 'gender' ? fieldCardFocusStyle : {}),
              }}
            >
              <label style={labelStyle} htmlFor="gender">
                <span style={labelIconStyle}>
                  <UserRound size={13} />
                </span>
                Gender
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  id="gender"
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('gender')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...inputBaseStyle,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    paddingRight: 28,
                    cursor: 'pointer',
                    color: form.gender
                      ? 'hsl(var(--foreground))'
                      : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'hsl(var(--muted-foreground))',
                    pointerEvents: 'none',
                  }}
                />
              </div>
              <span style={helperStyle}>
                <Info size={10} />
                Used for gender-specific conditions
              </span>
            </div>
          </div>

          {/* ── Medical history ─────────────────────────── */}
          <div
            style={{
              ...fieldCardStyle,
              ...(focusedField === 'medicalHistory' ? fieldCardFocusStyle : {}),
            }}
          >
            <label style={labelStyle} htmlFor="medicalHistory">
              <span style={labelIconStyle}>
                <ClipboardList size={13} />
              </span>
              Medical History
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  color: 'hsl(var(--muted-foreground))',
                  backgroundColor: 'hsl(var(--muted) / 0.5)',
                  padding: '1px 8px',
                  borderRadius: 999,
                  marginLeft: 4,
                }}
              >
                Optional
              </span>
            </label>
            <textarea
              id="medicalHistory"
              name="medicalHistory"
              rows={3}
              value={form.medicalHistory}
              onChange={handleChange}
              onFocus={() => setFocusedField('medicalHistory')}
              onBlur={() => setFocusedField(null)}
              placeholder="Diabetes, hypertension, allergies to penicillin, daily aspirin..."
              style={{
                ...inputBaseStyle,
                minHeight: 70,
              }}
            />
            <span style={helperStyle}>
              <Info size={10} />
              Include ongoing conditions, allergies, or current medications
            </span>
          </div>

          {/* ── Error banner ───────────────────────────── */}
          {displayError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                borderRadius: '0.75rem',
                border: '1px solid hsl(var(--destructive) / 0.25)',
                backgroundColor: 'hsl(var(--destructive) / 0.06)',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  backgroundColor: 'hsl(var(--destructive) / 0.12)',
                  color: 'hsl(var(--destructive))',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={13} />
              </div>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.5, color: 'hsl(var(--destructive))' }}>
                {displayError}
              </p>
            </div>
          )}

          {/* ── Actions ────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 12,
              paddingTop: 4,
            }}
          >
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: '0.75rem',
                padding: '11px 22px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'hsl(var(--primary-foreground))',
                background: loading
                  ? 'hsl(var(--primary) / 0.7)'
                  : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
                transition: 'all 0.2s ease',
                boxShadow: loading
                  ? 'none'
                  : '0 2px 8px hsl(var(--primary) / 0.25)',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 14px hsl(var(--primary) / 0.35)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = loading
                  ? 'none'
                  : '0 2px 8px hsl(var(--primary) / 0.25)'
              }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {loading ? 'Analyzing…' : 'Check Symptoms'}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderRadius: '0.75rem',
                padding: '11px 18px',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'hsl(var(--muted-foreground))',
                backgroundColor: 'transparent',
                border: '1px solid hsl(var(--border))',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = 'hsl(var(--foreground) / 0.2)'
                  e.currentTarget.style.color = 'hsl(var(--foreground))'
                  e.currentTarget.style.backgroundColor = 'hsl(var(--muted) / 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'hsl(var(--border))'
                e.currentTarget.style.color = 'hsl(var(--muted-foreground))'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <RotateCcw size={13} />
              Reset
            </button>

            {/* Fill progress hint */}
            {!loading && (
              <span
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.7rem',
                  color: isFilled
                    ? 'hsl(142 76% 36%)'
                    : 'hsl(var(--muted-foreground))',
                  transition: 'color 0.2s ease',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: isFilled
                      ? 'hsl(142 76% 36%)'
                      : 'hsl(var(--muted-foreground) / 0.4)',
                    transition: 'background-color 0.2s ease',
                  }}
                />
                {isFilled ? 'Ready to check' : 'Symptoms required'}
              </span>
            )}
          </div>
        </div>
      </form>
    </section>
  )
}

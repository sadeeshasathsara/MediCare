import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'

const INITIAL_FORM = {
  symptoms: '',
  age: '',
  gender: '',
  medicalHistory: '',
}

export default function SymptomCheckerForm({ loading, error, onSubmit }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [validationError, setValidationError] = useState('')

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

  return (
    <section
      className="rounded-2xl border p-5 md:p-6"
      style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }} htmlFor="symptoms">
            Symptoms
          </label>
          <textarea
            id="symptoms"
            name="symptoms"
            rows={5}
            value={form.symptoms}
            onChange={handleChange}
            placeholder="Example: Fever, sore throat, dry cough for 2 days"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2"
            style={{
              backgroundColor: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
              boxShadow: 'none',
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }} htmlFor="age">
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
              placeholder="25"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2"
              style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }} htmlFor="gender">
              Gender
            </label>
            <input
              id="gender"
              name="gender"
              type="text"
              value={form.gender}
              onChange={handleChange}
              placeholder="male / female / other"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2"
              style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }} htmlFor="medicalHistory">
            Medical history (optional)
          </label>
          <textarea
            id="medicalHistory"
            name="medicalHistory"
            rows={3}
            value={form.medicalHistory}
            onChange={handleChange}
            placeholder="Any ongoing conditions, allergies, or medications"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2"
            style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          />
        </div>

        {(validationError || error) && (
          <div
            className="rounded-xl border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'hsl(var(--destructive) / 0.08)',
              borderColor: 'hsl(var(--destructive) / 0.25)',
              color: 'hsl(var(--destructive))',
            }}
          >
            {validationError || error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-65"
            style={{ backgroundColor: 'hsl(var(--primary))' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Analyzing...' : 'Check Symptoms'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-65"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          >
            Reset
          </button>
        </div>
      </form>
    </section>
  )
}

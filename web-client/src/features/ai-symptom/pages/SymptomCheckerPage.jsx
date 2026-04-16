import { useEffect, useCallback } from 'react'
import {
  Sparkles,
  BrainCircuit,
  ShieldCheck,
  Clock,
  Stethoscope,
  X,
} from 'lucide-react'
import { useSymptomChecker } from '@/features/ai-symptom/hooks/useSymptomChecker'
import SymptomCheckerForm from '@/features/ai-symptom/components/SymptomCheckerForm'
import SymptomResultCard from '@/features/ai-symptom/components/SymptomResultCard'

/* ── Feature highlight cards ──────────────────────────────── */

const FEATURES = [
  {
    icon: BrainCircuit,
    title: 'AI-Powered Analysis',
    desc: 'Leverages advanced AI to evaluate your symptoms and suggest possible conditions.',
  },
  {
    icon: ShieldCheck,
    title: 'Urgency Assessment',
    desc: 'Provides a triage-level urgency rating so you know when to seek care.',
  },
  {
    icon: Stethoscope,
    title: 'Doctor Recommendations',
    desc: 'Suggests the right type of specialist based on your reported symptoms.',
  },
  {
    icon: Clock,
    title: 'Instant Results',
    desc: 'Get a comprehensive triage summary within seconds — anytime, anywhere.',
  },
]

/* ── Keyframe injection (runs once) ───────────────────────── */

const KEYFRAMES_ID = 'symptom-page-keyframes'

function ensureKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById(KEYFRAMES_ID)) return

  const style = document.createElement('style')
  style.id = KEYFRAMES_ID
  style.textContent = `
    @keyframes sp-overlayIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes sp-modalIn {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes sp-overlayOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    @keyframes sp-modalOut {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to   { opacity: 0; transform: translateY(16px) scale(0.97); }
    }
  `
  document.head.appendChild(style)
}

/* ── Result Modal ─────────────────────────────────────────── */

function ResultModal({ result, doctors, doctorLookupStatus, doctorLookupError, onClose }) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    ensureKeyframes()
    document.addEventListener('keydown', handleKeyDown)
    // Prevent body scroll while modal is open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prev
    }
  }, [handleKeyDown])

  if (!result) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Triage Result"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'sp-overlayIn 0.25s ease both',
        }}
      />

      {/* Modal panel */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 680,
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          borderRadius: '1rem',
          border: '1px solid hsl(var(--border))',
          backgroundColor: 'hsl(var(--card))',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          animation: 'sp-modalIn 0.35s ease both',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close result"
          style={{
            position: 'sticky',
            top: 12,
            float: 'right',
            marginRight: 12,
            zIndex: 10,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            backgroundColor: 'hsl(var(--card) / 0.9)',
            backdropFilter: 'blur(4px)',
            color: 'hsl(var(--muted-foreground))',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'hsl(var(--destructive) / 0.1)'
            e.currentTarget.style.borderColor = 'hsl(var(--destructive) / 0.3)'
            e.currentTarget.style.color = 'hsl(var(--destructive))'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'hsl(var(--card) / 0.9)'
            e.currentTarget.style.borderColor = 'hsl(var(--border))'
            e.currentTarget.style.color = 'hsl(var(--muted-foreground))'
          }}
        >
          <X size={16} />
        </button>

        <SymptomResultCard
          result={result}
          doctors={doctors}
          doctorLookupStatus={doctorLookupStatus}
          doctorLookupError={doctorLookupError}
        />
      </div>
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────── */

export default function SymptomCheckerPage() {
  const { loading, error, result, setResult, recommendedDoctors, doctorLookupStatus, doctorLookupError, submitCheck } = useSymptomChecker()

  const closeModal = useCallback(() => setResult(null), [setResult])

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* ── Page header ──────────────────────────────── */}
        <header
          style={{
            borderRadius: '1rem',
            border: '1px solid hsl(var(--border))',
            overflow: 'hidden',
            background:
              'linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
          }}
        >
          {/* Accent bar */}
          <div
            style={{
              height: 3,
              background:
                'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.3))',
            }}
          />

          <div style={{ padding: '24px 28px' }}>
            <div className="flex items-start gap-4 flex-wrap">
              {/* Icon */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background:
                    'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.65))',
                  color: 'hsl(var(--primary-foreground))',
                  flexShrink: 0,
                  boxShadow: '0 4px 16px hsl(var(--primary) / 0.25)',
                }}
              >
                <BrainCircuit size={24} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1
                    style={{
                      fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',
                      fontWeight: 800,
                      color: 'hsl(var(--foreground))',
                      letterSpacing: '-0.025em',
                      lineHeight: 1.25,
                    }}
                  >
                    AI Symptom Checker
                  </h1>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 10px',
                      borderRadius: 999,
                      backgroundColor: 'hsl(var(--primary) / 0.1)',
                      color: 'hsl(var(--primary))',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <Sparkles size={11} />
                    AI Powered
                  </span>
                </div>

                <p
                  style={{
                    marginTop: 6,
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    color: 'hsl(var(--muted-foreground))',
                    maxWidth: 600,
                  }}
                >
                  Describe your symptoms, age, and medical history to receive an
                  instant AI-powered triage summary — with urgency guidance,
                  possible conditions, and doctor recommendations.
                </p>
              </div>
            </div>

            {/* ── Feature cards row ─────────────────────── */}
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
              style={{ marginTop: 20 }}
            >
              {FEATURES.map((feat) => (
                <div
                  key={feat.title}
                  style={{
                    borderRadius: '0.75rem',
                    border: '1px solid hsl(var(--border) / 0.6)',
                    backgroundColor: 'hsl(var(--background) / 0.5)',
                    padding: '14px 14px 12px',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'hsl(var(--primary) / 0.3)'
                    e.currentTarget.style.boxShadow = '0 2px 12px hsl(var(--primary) / 0.06)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'hsl(var(--border) / 0.6)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      backgroundColor: 'hsl(var(--primary) / 0.1)',
                      color: 'hsl(var(--primary))',
                      marginBottom: 8,
                    }}
                  >
                    <feat.icon size={15} />
                  </div>
                  <h3
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'hsl(var(--foreground))',
                      lineHeight: 1.3,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {feat.title}
                  </h3>
                  <p
                    style={{
                      marginTop: 3,
                      fontSize: '0.65rem',
                      lineHeight: 1.45,
                      color: 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ── Form ─────────────────────────────────────── */}
        <SymptomCheckerForm
          loading={loading}
          error={error}
          onSubmit={submitCheck}
        />
      </div>

      {/* ── Result popup modal ─────────────────────────── */}
      {result && (
        <ResultModal
          result={result}
          doctors={recommendedDoctors}
          doctorLookupStatus={doctorLookupStatus}
          doctorLookupError={doctorLookupError}
          onClose={closeModal}
        />
      )}
    </>
  )
}

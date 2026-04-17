import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  BrainCircuit,
  ShieldCheck,
  Clock,
  Stethoscope,
  HeartPulse,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getPatientProfile } from '@/features/patients/services/patientApi'
import SymptomChatBox from '@/features/ai-symptom/components/SymptomChatBox'

/* ── Feature highlight cards ──────────────────────────────── */

const FEATURES = [
  {
    icon: BrainCircuit,
    title: 'AI Consultation',
    desc: 'Describe your symptoms in natural language and chat with our specialized AI.',
  },
  {
    icon: ShieldCheck,
    title: 'Specialist Matching',
    desc: 'Our AI identifies the right specialty and suggests the best doctors for you.',
  },
  {
    icon: Stethoscope,
    title: 'One-Click Booking',
    desc: 'Seamlessly schedule appointments with recommended specialists.',
  },
  {
    icon: Clock,
    title: 'Instant Support',
    desc: 'Available 24/7 to provide triage guidance and health information.',
  },
]

export default function SymptomCheckerPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const userId = user?.id || ''

  useEffect(() => {
    if (userId) {
      getPatientProfile(userId)
        .then(setProfile)
        .catch(err => console.error('Failed to load profile for AI context:', err))
    }
  }, [userId])

  const handleBookAppointment = useCallback(
    (doctor, symptomResult) => {
      if (!doctor) return

      const specialty =
        String(doctor?.specialty || symptomResult?.recommendedSpecialty || '').trim() ||
        'General Practice'
      const doctorName = String(doctor?.fullName || doctor?.email || 'Doctor').trim()
      const reasonSeed = Array.isArray(symptomResult?.possibleConditions)
        ? symptomResult.possibleConditions.filter(Boolean).slice(0, 2).join(', ')
        : ''

      const reason = reasonSeed
        ? `AI consultation suggested: ${reasonSeed}.`
        : 'Appointment requested via AI doctor recommendation.'

      navigate('/patient/appointments/new', {
        state: {
          prefill: {
            doctorId: String(doctor?.userId || doctor?.id || '').trim(),
            doctorName,
            specialty,
            reason,
          },
        },
      })
    },
    [navigate],
  )

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-8 animate-in fade-in duration-700">
      {/* ── Page header ──────────────────────────────── */}
      <header className="relative py-12 px-8 rounded-3xl overflow-hidden border border-primary/10 shadow-2xl shadow-primary/5">
        {/* Abstract background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary animate-bounce-subtle">
            <HeartPulse size={16} />
            <span className="text-xs font-bold tracking-widest uppercase">MediCare AI Doctor</span>
          </div>
          
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
              How are you feeling, <span className="text-primary">{profile?.name || user?.name || 'today'}?</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Describe your symptoms and our specialized AI assistant will help you identify potential causes and find the perfect doctor.
            </p>
          </div>

          {/* Quick Feature Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full pt-4">
            {FEATURES.map((feat) => (
              <div key={feat.title} className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/20 transition-all hover:shadow-lg group">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <feat.icon size={20} />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">{feat.title}</h3>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main Chat Section ────────────────────────────── */}
      <section className="relative group">
        <SymptomChatBox 
          profile={profile} 
          onBookAppointment={handleBookAppointment}
        />
      </section>

      {/* ── Safety Disclaimer ────────────────────────────── */}
      <footer className="text-center px-4">
        <div className="inline-flex items-center gap-2 p-3 px-5 rounded-2xl bg-muted/50 border border-border/50 text-muted-foreground text-[11px] max-w-xl mx-auto leading-relaxed">
          <ShieldCheck size={14} className="shrink-0 text-primary" />
          <span>
            <strong>Safety Note:</strong> AI assessments are for informational purposes only and are not medical diagnoses. 
            In case of emergency, please visit your nearest hospital immediately.
          </span>
        </div>
      </footer>
    </div>
  )
}

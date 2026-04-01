import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    HeartPulse,
    ShieldCheck,
    Stethoscope,
    CalendarCheck,
    Video,
    CreditCard,
    Bell,
    BrainCircuit,
    ArrowRight,
    CheckCircle2,
    Star,
    ChevronRight,
    Play,
} from 'lucide-react'

const features = [
    {
        icon: CalendarCheck,
        title: 'Effortless appointment booking',
        subtitle: 'Your health, your schedule',
        desc: 'Browse available doctors by specialty, pick a time that works for you, and confirm in seconds. Reschedule or cancel anytime — no phone calls, no waiting on hold.',
        points: ['Smart availability calendar', 'Instant confirmation', 'Easy reschedule & cancellation'],
        img: 'appointments',
        accent: 'rgba(23,170,207,0.12)',
    },
    {
        icon: Video,
        title: 'Consult from anywhere',
        subtitle: 'Telemedicine, reimagined',
        desc: 'High-quality video consultations with verified doctors — from your living room, office, or anywhere in between. Get the care you need without the commute.',
        points: ['HD video with zero lag', 'In-call prescriptions', 'Session recording & notes'],
        img: 'telemedicine',
        accent: '#edf2fa',
    },
    {
        icon: BrainCircuit,
        title: 'AI-powered symptom guidance',
        subtitle: 'Know before you go',
        desc: "Describe how you're feeling and our AI surfaces likely causes, urgency levels, and which specialist makes most sense for your situation — before you even book.",
        points: ['Symptom severity scoring', 'Specialist matching', 'Evidence-based suggestions'],
        img: 'ai',
        accent: '#f5edf5',
    },
]

const stats = [
    { num: '50k+', label: 'Patients served' },
    { num: '1,200+', label: 'Verified doctors' },
    { num: '98%', label: 'Satisfaction rate' },
    { num: '24/7', label: 'Available support' },
]

const services = [
    { icon: ShieldCheck, title: 'Account & security', desc: 'Role-based access for patients, doctors, and admins.' },
    { icon: HeartPulse, title: 'Patient profiles', desc: 'Organized health records, easy to update anytime.' },
    { icon: Stethoscope, title: 'Doctor onboarding', desc: 'Verified sign-up flow before platform access.' },
    { icon: CreditCard, title: 'Secure payments', desc: 'Pay safely and track billing history at a glance.' },
    { icon: Bell, title: 'Smart notifications', desc: 'Timely reminders so you never miss an appointment.' },
    { icon: Video, title: 'Video consults', desc: 'Attend consultations from anywhere, any device.' },
]

const testimonials = [
    {
        name: 'Priya Mendis',
        role: 'Patient',
        text: 'Booked a cardiologist in under two minutes. The video call quality was flawless — felt like being in the room.',
        stars: 5,
    },
    {
        name: 'Dr. Nilan Perera',
        role: 'Cardiologist',
        text: 'The doctor dashboard is incredibly intuitive. My patient load is well managed and the billing is seamless.',
        stars: 5,
    },
    {
        name: 'Amara Silva',
        role: 'Patient',
        text: 'The AI symptom checker pointed me to the right specialist immediately. Saved me days of uncertainty.',
        stars: 5,
    },
    {
        name: 'Dr. Kavya Raj',
        role: 'General Practitioner',
        text: 'Verification was fast and I started seeing patients within 48 hours. The platform is a game changer.',
        stars: 5,
    },
    {
        name: 'Roshan Fernando',
        role: 'Patient',
        text: "Finally a healthcare app that doesn't feel like it was designed in 2010. Clean, fast, and actually helpful.",
        stars: 5,
    },
    {
        name: 'Tharushi Wickrama',
        role: 'Patient',
        text: 'The reminders kept me on track with my follow-ups. Payment was super easy and the receipts are instant.',
        stars: 5,
    },
]

function scrollToSection(e, id) {
    if (!id) return
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function HeroIllustration() {
    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: 520, margin: '0 auto' }}>
            <div
                style={{
                    background: '#fff',
                    borderRadius: 24,
                    padding: '28px 32px',
                    boxShadow: '0 24px 64px rgba(26,21,16,0.12)',
                    animation: 'lp-floatA 6s ease-in-out infinite',
                    position: 'relative',
                    zIndex: 2,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg,#17aacf,#17aacf)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <HeartPulse size={22} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Your next appointment</div>
                        <div style={{ fontSize: '0.78rem', color: '#8a7e74' }}>Today, 3:30 PM</div>
                    </div>
                    <div
                        style={{
                            marginLeft: 'auto',
                            background: 'rgba(23,170,207,0.12)',
                            color: '#17aacf',
                            borderRadius: 100,
                            padding: '4px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                        }}
                    >
                        Confirmed
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d, i) => (
                        <div
                            key={d}
                            style={{
                                flex: 1,
                                textAlign: 'center',
                                padding: '10px 0',
                                borderRadius: 12,
                                background: i === 2 ? '#17aacf' : '#f5f0eb',
                                color: i === 2 ? '#fff' : '#8a7e74',
                                fontSize: '0.72rem',
                                fontWeight: i === 2 ? 700 : 400,
                            }}
                        >
                            <div>{d}</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: 2 }}>{10 + i * 2}</div>
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        background: '#f8f5f0',
                        borderRadius: 14,
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    <div
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg,#e8d5c4,#d4b896)',
                            flexShrink: 0,
                        }}
                    />
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Dr. Aanya Krishnan</div>
                        <div style={{ fontSize: '0.75rem', color: '#8a7e74' }}>Cardiologist · 4.9 ★</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: '#17aacf',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Video size={16} color="#fff" />
                        </div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    position: 'absolute',
                    top: -20,
                    right: -30,
                    zIndex: 3,
                    background: '#fff',
                    borderRadius: 14,
                    padding: '10px 16px',
                    boxShadow: '0 8px 32px rgba(26,21,16,0.13)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    animation: 'lp-floatB 5s ease-in-out infinite 0.5s',
                    whiteSpace: 'nowrap',
                }}
            >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#17aacf', position: 'relative' }}>
                    <div
                        style={{
                            position: 'absolute',
                            inset: -2,
                            borderRadius: '50%',
                            border: '2px solid #17aacf',
                            animation: 'lp-pulse-ring 1.5s ease infinite',
                        }}
                    />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>AI symptom check complete</span>
            </div>

            <div
                style={{
                    position: 'absolute',
                    bottom: -18,
                    left: -24,
                    zIndex: 3,
                    background: '#17aacf',
                    borderRadius: 14,
                    padding: '10px 16px',
                    boxShadow: '0 8px 32px rgba(23,170,207,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    animation: 'lp-floatC 4.5s ease-in-out infinite 1s',
                    whiteSpace: 'nowrap',
                }}
            >
                <Star size={14} color="#ffd166" fill="#ffd166" />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>98% patient satisfaction</span>
            </div>

            <div
                style={{
                    position: 'absolute',
                    top: '30%',
                    left: -50,
                    width: 100,
                    height: 100,
                    zIndex: 0,
                    borderRadius: '50%',
                    border: '1.5px dashed rgba(23,170,207,0.28)',
                    animation: 'lp-spin-slow 20s linear infinite',
                }}
            />
        </div>
    )
}

function FeatureIllustration({ type, accent }) {
    const colors = { appointments: '#17aacf', telemedicine: '#4a6fa5', ai: '#8a4fa5' }
    const c = colors[type] || '#17aacf'

    if (type === 'appointments')
        return (
            <div
                style={{
                    background: accent,
                    borderRadius: 24,
                    padding: 32,
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 320,
                }}
            >
                <div style={{ background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontWeight: 700, fontFamily: 'Instrument Serif,serif', fontSize: '1.1rem' }}>April 2026</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {['<', '>'].map((a) => (
                                <button
                                    key={a}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        border: '1.5px solid #e0d8d0',
                                        background: 'none',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    {a}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, fontSize: '0.7rem', textAlign: 'center' }}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                            <div key={d} style={{ color: '#8a7e74', fontWeight: 600, paddingBottom: 6 }}>
                                {d}
                            </div>
                        ))}
                        {[...Array(30)].map((_, i) => {
                            const d = i + 1
                            const booked = [5, 12, 19, 23].includes(d)
                            const today = d === 14
                            return (
                                <div
                                    key={d}
                                    style={{
                                        aspectRatio: '1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '50%',
                                        fontSize: '0.75rem',
                                        fontWeight: today || booked ? 700 : 400,
                                        background: today ? c : booked ? `${c}22` : 'none',
                                        color: today ? '#fff' : booked ? c : '#1a1510',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {d}
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div
                    style={{
                        marginTop: 14,
                        background: '#fff',
                        borderRadius: 14,
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    }}
                >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 }} />
                    <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>3:30 PM — Dr. Krishnan, Cardiology</div>
                    <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: c, fontWeight: 600 }}>Confirmed</div>
                </div>
            </div>
        )

    if (type === 'telemedicine')
        return (
            <div style={{ background: accent, borderRadius: 24, padding: 32, minHeight: 320, position: 'relative' }}>
                <div style={{ background: '#1a2035', borderRadius: 18, padding: 20, minHeight: 200, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, height: 180 }}>
                        {[
                            { label: 'Dr. Nilan Perera', bg: 'linear-gradient(135deg,#2d3a5f,#1a2035)' },
                            { label: 'Priya Mendis', bg: 'linear-gradient(135deg,#3a2d1a,#2a1f12)' },
                        ].map((p) => (
                            <div
                                key={p.label}
                                style={{
                                    borderRadius: 12,
                                    background: p.bg,
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    padding: 10,
                                }}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '30%',
                                        left: '50%',
                                        transform: 'translate(-50%,-50%)',
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.15)',
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: '0.68rem',
                                        color: 'rgba(255,255,255,0.8)',
                                        background: 'rgba(0,0,0,0.4)',
                                        borderRadius: 6,
                                        padding: '3px 8px',
                                    }}
                                >
                                    {p.label}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14 }}>
                        {[{ bg: '#e74c3c', icon: '✕' }, { bg: '#17aacf', icon: '▶' }, { bg: '#3a3a4a', icon: '🎤' }].map((b) => (
                            <div
                                key={b.bg}
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: '50%',
                                    background: b.bg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.85rem',
                                    color: '#fff',
                                    cursor: 'pointer',
                                }}
                            >
                                {b.icon}
                            </div>
                        ))}
                    </div>
                </div>
                <div
                    style={{
                        marginTop: 14,
                        background: '#fff',
                        borderRadius: 14,
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    }}
                >
                    <div
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#17aacf',
                            animation: 'lp-pulse-ring 1.5s ease infinite',
                        }}
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Live consultation · 12:34</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#8a7e74' }}>HD · Encrypted</span>
                </div>
            </div>
        )

    return (
        <div style={{ background: accent, borderRadius: 24, padding: 32, minHeight: 320 }}>
            <div style={{ background: '#fff', borderRadius: 18, padding: 22, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg,#8a4fa5,#c47fd4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <BrainCircuit size={18} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Symptom Analysis</span>
                </div>
                {[
                    { label: 'Fatigue', val: 72 },
                    { label: 'Headache', val: 55 },
                    { label: 'Shortness of breath', val: 38 },
                ].map((s) => (
                    <div key={s.label} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                            <span style={{ color: '#5a5048' }}>{s.label}</span>
                            <span style={{ fontWeight: 600, color: c }}>{s.val}%</span>
                        </div>
                        <div style={{ background: '#f0ece8', borderRadius: 100, height: 6, overflow: 'hidden' }}>
                            <div
                                style={{
                                    width: `${s.val}%`,
                                    height: '100%',
                                    borderRadius: 100,
                                    background: `linear-gradient(90deg,${c},${c}99)`,
                                    transition: 'width 1s ease',
                                }}
                            />
                        </div>
                    </div>
                ))}
                <div style={{ background: `${c}11`, borderRadius: 12, padding: '12px 14px', marginTop: 16, borderLeft: `3px solid ${c}` }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: c, marginBottom: 2 }}>Suggested specialist</div>
                    <div style={{ fontSize: '0.82rem', color: '#1a1510' }}>Pulmonologist · Low urgency</div>
                </div>
            </div>
        </div>
    )
}

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        const root = document.querySelector('.landing-page')
        if (!root) return

        const els = root.querySelectorAll('.reveal,.reveal-left,.reveal-right')
        const obs = new IntersectionObserver(
            (entries) =>
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible')
                        obs.unobserve(entry.target)
                    }
                }),
            { threshold: 0.12 }
        )

        els.forEach((el) => obs.observe(el))
        return () => obs.disconnect()
    }, [])

    return (
        <div className="landing-page" style={{ minHeight: '100vh' }}>
            <header
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    transition: 'all 0.3s',
                    background: scrolled ? 'rgba(248,245,240,0.92)' : 'transparent',
                    backdropFilter: scrolled ? 'blur(12px)' : 'none',
                    borderBottom: scrolled ? '1px solid rgba(200,191,180,0.4)' : '1px solid transparent',
                    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
                }}
            >
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', gap: 40 }}>
                    <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                        <HeartPulse size={26} color="#17aacf" />
                        <span style={{ fontSize: '1.2rem', color: '#1a1510', fontWeight: 600 }}>
                            MediCare
                        </span>
                    </a>

                    <nav style={{ display: 'flex', gap: 32, flex: 1, justifyContent: 'center' }} className="hide-mobile">
                        {[
                            { label: 'Features', id: 'features' },
                            { label: 'Services', id: 'services' },
                            { label: 'Testimonials', id: 'testimonials' },
                        ].map((l) => (
                            <a key={l.id} href={`#${l.id}`} className="nav-link" onClick={(e) => scrollToSection(e, l.id)}>
                                {l.label}
                            </a>
                        ))}
                    </nav>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Link to="/login" className="btn-outline hide-mobile" style={{ padding: '10px 22px', fontSize: '0.85rem' }}>
                            Sign in
                        </Link>
                        <Link to="/register" className="btn-primary" style={{ padding: '10px 22px', fontSize: '0.85rem' }}>
                            Get started <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>
            </header>

            <section
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '100px 24px 60px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: -100,
                        right: -100,
                        width: 600,
                        height: 600,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(23,170,207,0.08) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: -80,
                        left: -80,
                        width: 400,
                        height: 400,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(23,170,207,0.06) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }}
                />

                <div
                    className="lp-hero-grid"
                    style={{
                        maxWidth: 1200,
                        margin: '0 auto',
                        width: '100%',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 80,
                        alignItems: 'center',
                    }}
                >
                    <div style={{ animation: 'lp-fadeUp 0.9s ease both' }}>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 24,
                                background: 'rgba(23,170,207,0.12)',
                                borderRadius: 100,
                                padding: '6px 14px 6px 8px',
                            }}
                        >
                            <div style={{ background: '#17aacf', borderRadius: 100, padding: '3px 10px' }}>
                                <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 700, letterSpacing: '0.05em' }}>NEW</span>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: '#17aacf', fontWeight: 500 }}>
                                AI symptom guidance is now live
                            </span>
                        </div>

                        <h1 className="serif" style={{ fontSize: 'clamp(2.6rem, 5vw, 4rem)', lineHeight: 1.1, marginBottom: 22, color: '#1a1510' }}>
                            Healthcare that works
                            <br />
                            <span style={{ fontStyle: 'italic', color: '#17aacf' }}>around your life.</span>
                        </h1>

                        <p style={{ fontSize: '1.05rem', color: '#6b5f55', lineHeight: 1.7, maxWidth: 480, marginBottom: 36 }}>
                            Book appointments in seconds, consult doctors via video, pay securely, and let AI guide your next
                            step — all in one beautifully simple platform.
                        </p>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
                            <Link to="/register" className="btn-primary">
                                Start for free <ArrowRight size={16} />
                            </Link>
                            <a href="#features" className="btn-outline" onClick={(e) => scrollToSection(e, 'features')}>
                                <Play size={14} fill="#1a1510" /> See how it works
                            </a>
                        </div>

                        <div style={{ display: 'flex', gap: 28 }}>
                            {[
                                ['50k+', 'Patients'],
                                ['1,200+', 'Doctors'],
                                ['98%', 'Satisfaction'],
                            ].map(([n, l]) => (
                                <div key={l}>
                                    <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: '1.6rem', color: '#17aacf', lineHeight: 1 }}>{n}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#8a7e74', marginTop: 2 }}>{l}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ animation: 'lp-fadeUp 0.9s ease 0.2s both' }}>
                        <HeroIllustration />
                    </div>
                </div>
            </section>

            <div style={{ borderTop: '1px solid #e0d8d0', borderBottom: '1px solid #e0d8d0', background: '#fff', padding: '16px 0', overflow: 'hidden' }}>
                <div className="marquee-track">
                    {[...Array(2)].map((_, outer) => (
                        <div key={outer} style={{ display: 'flex', gap: 48, paddingRight: 48, flexShrink: 0 }}>
                            {[
                                'Appointment Booking',
                                'Telemedicine',
                                'AI Symptom Check',
                                'Secure Payments',
                                'Verified Doctors',
                                'Smart Reminders',
                                'Health Records',
                                '24/7 Support',
                            ].map((t) => (
                                <span
                                    key={t}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        fontSize: '0.85rem',
                                        color: '#8a7e74',
                                        fontWeight: 500,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <span style={{ color: '#17aacf', fontSize: '1.1rem' }}>✦</span>
                                    {t}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <section id="features" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
                <div className="reveal" style={{ textAlign: 'center', marginBottom: 72 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.12em', color: '#17aacf', textTransform: 'uppercase', marginBottom: 12 }}>
                        Platform features
                    </div>
                    <h2 className="serif" style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', color: '#1a1510', lineHeight: 1.15 }}>
                        Everything you need,
                        <br />
                        <span style={{ fontStyle: 'italic' }}>beautifully organized.</span>
                    </h2>
                </div>

                {features.map((f, i) => {
                    const isEven = i % 2 === 0
                    return (
                        <div
                            key={f.title}
                            className="lp-two-col"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 72,
                                alignItems: 'center',
                                marginBottom: 100,
                            }}
                        >
                            <div className={isEven ? 'reveal-left' : 'reveal-right'} style={{ order: isEven ? 0 : 1 }}>
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: 14,
                                        background: `${f.accent}`,
                                        borderRadius: 100,
                                        padding: '5px 14px',
                                    }}
                                >
                                    <f.icon size={14} color="#17aacf" />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#17aacf' }}>{f.subtitle}</span>
                                </div>
                                <h3 className="serif" style={{ fontSize: 'clamp(1.7rem, 2.5vw, 2.2rem)', color: '#1a1510', lineHeight: 1.2, marginBottom: 16 }}>
                                    {f.title}
                                </h3>
                                <p style={{ color: '#6b5f55', lineHeight: 1.75, marginBottom: 24, fontSize: '0.95rem' }}>{f.desc}</p>
                                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {f.points.map((p) => (
                                        <li key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: '#3d342b' }}>
                                            <CheckCircle2 size={16} color="#17aacf" style={{ flexShrink: 0 }} />
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    to="/register"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 28, color: '#17aacf', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}
                                >
                                    Learn more <ChevronRight size={15} />
                                </Link>
                            </div>

                            <div className={isEven ? 'reveal-right' : 'reveal-left'} style={{ order: isEven ? 1 : 0 }}>
                                <FeatureIllustration type={f.img} accent={f.accent} />
                            </div>
                        </div>
                    )
                })}
            </section>

            <section style={{ background: '#1a1510', padding: '80px 24px' }}>
                <div className="lp-stats-grid" style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 40, textAlign: 'center' }}>
                    {stats.map((s, i) => (
                        <div key={s.label} className="reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                            <div className="stat-num">{s.num}</div>
                            <div style={{ color: '#8a7e74', fontSize: '0.85rem', marginTop: 6 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section id="services" style={{ padding: '100px 24px', background: '#fff' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div className="reveal" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'end', marginBottom: 60 }}>
                        <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.12em', color: '#17aacf', textTransform: 'uppercase', marginBottom: 12 }}>
                                What's included
                            </div>
                            <h2 className="serif" style={{ fontSize: 'clamp(2rem, 3vw, 2.6rem)', color: '#1a1510', lineHeight: 1.15 }}>
                                A complete platform,
                                <br />
                                <span style={{ fontStyle: 'italic' }}>not just an app.</span>
                            </h2>
                        </div>
                        <p style={{ color: '#6b5f55', lineHeight: 1.7, fontSize: '0.95rem' }}>
                            Every feature is built with real patients and doctors in mind. No bloat, no complexity — just the tools
                            that matter, working seamlessly together.
                        </p>
                    </div>

                    <div className="lp-cards-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
                        {services.map((s, i) => (
                            <div
                                key={s.title}
                                className="card-hover reveal"
                                style={{
                                    transitionDelay: `${i * 0.08}s`,
                                    background: '#f8f5f0',
                                    borderRadius: 20,
                                    padding: '28px 24px',
                                    border: '1px solid #e8e0d8',
                                }}
                            >
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(23,170,207,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                    <s.icon size={20} color="#17aacf" />
                                </div>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 8 }}>{s.title}</div>
                                <div style={{ color: '#8a7e74', fontSize: '0.83rem', lineHeight: 1.6 }}>{s.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="testimonials" style={{ padding: '100px 24px', background: '#f8f5f0' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div className="reveal" style={{ textAlign: 'center', marginBottom: 60 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.12em', color: '#17aacf', textTransform: 'uppercase', marginBottom: 12 }}>
                            Testimonials
                        </div>
                        <h2 className="serif" style={{ fontSize: 'clamp(2rem, 3vw, 2.6rem)', color: '#1a1510' }}>
                            Real people, real results.
                        </h2>
                    </div>

                    <div className="lp-cards-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
                        {testimonials.map((t, i) => (
                            <div
                                key={t.name}
                                className="card-hover reveal"
                                style={{
                                    transitionDelay: `${i * 0.08}s`,
                                    background: '#fff',
                                    borderRadius: 20,
                                    padding: '28px 24px',
                                    border: '1px solid #e8e0d8',
                                }}
                            >
                                <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
                                    {[...Array(t.stars)].map((_, j) => (
                                        <Star key={j} size={13} color="#ffd166" fill="#ffd166" />
                                    ))}
                                </div>
                                <p style={{ color: '#3d342b', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>
                                    “{t.text}”
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(23,170,207,0.20), rgba(23,170,207,0.45))', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#8a7e74' }}>{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section style={{ padding: '80px 24px' }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <div
                        className="reveal"
                        style={{
                            background: 'linear-gradient(135deg,#1a2e27,#17aacf)',
                            borderRadius: 28,
                            padding: '64px 56px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 40,
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: -60, left: 200, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

                        <div>
                            <h2 className="serif" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', color: '#fff', marginBottom: 12, lineHeight: 1.2 }}>
                                Your health journey
                                <br />
                                <span style={{ fontStyle: 'italic', color: 'rgba(23,170,207,0.70)' }}>starts today.</span>
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: 380 }}>
                                Join thousands of patients and doctors already using MediCare to make healthcare simpler and smarter.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
                            <Link
                                to="/register"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    background: '#fff',
                                    color: '#1a2e27',
                                    padding: '14px 28px',
                                    borderRadius: 100,
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    textDecoration: 'none',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                }}
                            >
                                Create free account <ArrowRight size={15} />
                            </Link>
                            <Link to="/login" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', textDecoration: 'none' }}>
                                Already have an account? Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <footer style={{ background: '#1a1510', padding: '48px 24px 32px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <HeartPulse size={22} color="#17aacf" />
                            <span className="serif" style={{ fontSize: '1.1rem', color: '#fff' }}>
                                MediCare
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 32 }}>
                            {['Privacy', 'Terms', 'Support', 'Contact'].map((l) => (
                                <a
                                    key={l}
                                    href="#"
                                    style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', textDecoration: 'none', transition: 'color 0.2s' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
                                    }}
                                >
                                    {l}
                                </a>
                            ))}
                        </div>
                    </div>
                    <div style={{ paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>
                            © {new Date().getFullYear()} MediCare. All rights reserved.
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>
                            Care, scheduling, and consultations — in one place.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

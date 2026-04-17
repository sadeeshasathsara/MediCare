import React, { useState } from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AiSymptomHero({ userName }) {
  const [prompt, setPrompt] = useState('')
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (prompt.trim()) {
      navigate('/patient/symptom-checker', { state: { initialPrompt: prompt.trim() } })
    } else {
      navigate('/patient/symptom-checker')
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-card/60 backdrop-blur-xl border border-primary/10 shadow-2xl">
        {/* Animated aurora background */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)/0.08) 0%, hsl(262 60% 55% / 0.05) 30%, hsl(192 91% 36% / 0.08) 60%, hsl(var(--primary)/0.03) 100%)',
          }}
        />
        <div
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-30 blur-3xl animate-pulse delay-75"
          style={{ background: 'hsl(var(--primary))', animationDuration: '6s' }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-20 blur-3xl animate-pulse delay-200"
          style={{ background: 'hsl(192 91% 36%)', animationDuration: '8s' }}
        />

        <div className="relative z-10 p-10 md:p-16 text-center space-y-10">
          {/* Heading */}
          <div className="space-y-4 max-w-3xl mx-auto flex flex-col items-center">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-semibold text-primary mb-2 shadow-inner">
              <Sparkles className="h-4 w-4 drop-shadow-md" />
              MediCare AI
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground lead leading-tight">
              {greeting}, {userName}. <br /> <span className="opacity-80">How are you feeling today?</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl leading-relaxed mx-auto">
              Describe your symptoms and our AI doctor will diagnose you and recommend the right specialist instantly.
            </p>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all duration-500 opacity-50" />
            <div className="relative flex items-center bg-background/90 backdrop-blur border border-primary/20 rounded-full p-2 shadow-xl hover:shadow-primary/10 transition-shadow">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="I have a headache and mild fever..."
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 px-6 py-4 text-base md:text-lg text-foreground placeholder:text-muted-foreground/60 focus:placeholder:-translate-y-4 focus:placeholder:opacity-0 focus:placeholder:duration-500"
              />
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="shrink-0 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-4 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5"
              >
                Start Chat
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


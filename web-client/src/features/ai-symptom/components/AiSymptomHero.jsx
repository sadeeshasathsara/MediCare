import React from 'react'
import { Sparkles } from 'lucide-react'
import SymptomChatBox from './SymptomChatBox'

export default function AiSymptomHero({ userName }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div className="space-y-8">
      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Animated aurora background */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)/0.15) 0%, hsl(262 60% 55% / 0.08) 30%, hsl(192 91% 36% / 0.10) 60%, hsl(var(--primary)/0.05) 100%)',
          }}
        />
        {/* Animated blobs */}
        <div
          className="absolute -top-20 -left-20 h-72 w-72 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ background: 'hsl(var(--primary))', animationDuration: '4s' }}
        />
        <div
          className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full opacity-15 blur-3xl animate-pulse"
          style={{ background: 'hsl(192 91% 36%)', animationDuration: '6s', animationDelay: '1s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-96 rounded-full opacity-10 blur-3xl animate-pulse"
          style={{ background: 'hsl(262 60% 55%)', animationDuration: '8s', animationDelay: '2s' }}
        />

        {/* Border */}
        <div className="absolute inset-0 rounded-3xl border border-primary/10" />

        {/* Content */}
        <div className="relative z-10 px-7 py-8 md:px-10 md:py-10 space-y-6">
          {/* Heading */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              AI Health Assistant
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {greeting}, {userName}! 👋
            </h1>
            <p className="text-muted-foreground text-base max-w-xl leading-relaxed">
              Describe your symptoms and our AI will instantly recommend the right specialist and available appointment slots for you.
            </p>
          </div>

          {/* Chat box */}
          <SymptomChatBox />
        </div>
      </div>
    </div>
  )
}

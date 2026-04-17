import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, AlertTriangle, ShieldCheck, Zap, AlertOctagon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { checkSymptoms } from '@/features/ai-symptom/services/aiSymptomApi'
import { listDoctors } from '@/features/doctors/services/doctorApi'
import RecommendedDoctors from './RecommendedDoctors'

const URGENCY_CONFIG = {
  LOW: {
    label: 'Low Urgency',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    icon: ShieldCheck,
  },
  MODERATE: {
    label: 'Moderate',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    icon: AlertTriangle,
  },
  HIGH: {
    label: 'High Priority',
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    icon: Zap,
  },
  EMERGENCY: {
    label: 'Emergency',
    color: 'bg-red-500/10 text-red-600 border-red-500/30',
    icon: AlertOctagon,
  },
}

function UrgencyBadge({ level }) {
  const cfg = URGENCY_CONFIG[level] || URGENCY_CONFIG.MODERATE
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function AiMessage({ content, result }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 space-y-3 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-sm bg-card/80 border border-muted/60 p-4 shadow-sm text-sm leading-relaxed text-foreground">
          {content}
        </div>

        {result && (
          <div className="rounded-2xl border bg-card/60 p-4 space-y-3 text-sm shadow-sm">
            {/* Urgency */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-semibold text-foreground/80 text-xs uppercase tracking-widest">Assessment</p>
              <UrgencyBadge level={result.urgencyLevel} />
            </div>

            {/* Conditions */}
            {result.possibleConditions?.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Possible Conditions</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.possibleConditions.map((c, i) => (
                    <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/15 font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended specialty */}
            {result.recommendedSpecialty && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-semibold">Recommended specialty:</span>
                <span className="font-bold text-primary">{result.recommendedSpecialty}</span>
              </div>
            )}

            {/* Advice */}
            {result.advice && (
              <div className="p-3 rounded-xl bg-muted/30 border border-muted text-[12px] text-muted-foreground leading-relaxed">
                💡 {result.advice}
              </div>
            )}

            {/* Disclaimer */}
            {result.disclaimer && (
              <p className="text-[10px] text-muted-foreground/60 italic leading-relaxed border-t pt-2">
                ⚕ {result.disclaimer}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function UserMessage({ content }) {
  return (
    <div className="flex gap-3 items-start justify-end">
      <div className="flex-1 max-w-[75%]">
        <div className="rounded-2xl rounded-tr-sm bg-primary/10 border border-primary/20 p-4 text-sm leading-relaxed text-foreground ml-auto">
          {content}
        </div>
      </div>
      <div className="h-8 w-8 rounded-full bg-muted border border-muted flex items-center justify-center shrink-0 mt-0.5">
        <User className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-card/80 border border-muted/60 p-4 shadow-sm">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-primary/40 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const INITIAL_MESSAGE = {
  role: 'ai',
  content: "Hi! I'm your MediCare AI assistant 👋 Tell me how you're feeling today — describe any symptoms you're experiencing and I'll help recommend the right specialist for you.",
}

export default function SymptomChatBox() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [doctors, setDoctors] = useState([])
  const [doctorsLoading, setDoctorsLoading] = useState(false)
  const [currentSpecialty, setCurrentSpecialty] = useState('')
  const [showDoctors, setShowDoctors] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const fetchDoctorsForResult = async (result) => {
    setDoctorsLoading(true)
    setShowDoctors(true)
    setCurrentSpecialty(result.recommendedSpecialty || '')

    try {
      let fetchedDoctors = []

      // First try by recommended doctor IDs
      if (result.recommendedDoctorIds?.length > 0) {
        const res = await listDoctors({ ids: result.recommendedDoctorIds.join(','), size: 6 })
        const items = res.content || (Array.isArray(res) ? res : [])
        if (items.length > 0) {
          fetchedDoctors = items
        }
      }

      // Fall back to specialty-based search
      if (fetchedDoctors.length === 0 && result.recommendedSpecialty) {
        const res = await listDoctors({ specialization: result.recommendedSpecialty, size: 6 })
        fetchedDoctors = res.content || (Array.isArray(res) ? res : [])
      }

      // Final fallback: any doctors
      if (fetchedDoctors.length === 0) {
        const res = await listDoctors({ size: 6 })
        fetchedDoctors = res.content || (Array.isArray(res) ? res : [])
      }

      setDoctors(fetchedDoctors)
    } catch (err) {
      console.error('Failed to fetch doctors:', err)
      setDoctors([])
    } finally {
      setDoctorsLoading(false)
    }
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMsg = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)
    setShowDoctors(false)

    try {
      const result = await checkSymptoms({ symptoms: trimmed, patientAge: null, patientGender: null })

      // Build natural-language response
      const conditions = result.possibleConditions?.join(', ') || 'various conditions'
      const responseText = `Based on what you've described, this could be related to **${conditions}**. I'd recommend seeing a **${result.recommendedSpecialty || 'General Physician'}** for a proper evaluation.`

      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: responseText, result },
      ])

      // Fetch matching doctors
      await fetchDoctorsForResult(result)
    } catch (err) {
      console.error('Symptom check failed:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: "I'm sorry, I couldn't analyze your symptoms right now. Please try again in a moment, or consult a doctor directly.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-6">
      {/* Chat window */}
      <div className="rounded-2xl border bg-background/60 backdrop-blur shadow-lg overflow-hidden">
        {/* Messages area */}
        <div className="h-72 overflow-y-auto p-5 space-y-5 scroll-smooth">
          {messages.map((msg, i) =>
            msg.role === 'ai'
              ? <AiMessage key={i} content={msg.content} result={msg.result} />
              : <UserMessage key={i} content={msg.content} />
          )}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t bg-muted/20 p-4">
          <div className="flex gap-3 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your symptoms… (e.g. 'I have a fever, sore throat and headache')"
              className="min-h-[44px] max-h-28 resize-none flex-1 bg-background border-muted/60 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/30 rounded-xl"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0 cursor-pointer"
            >
              {isLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
            AI-generated suggestions are not a substitute for professional medical advice.
          </p>
        </div>
      </div>

      {/* Recommended doctors — animate in after AI responds */}
      {showDoctors && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <RecommendedDoctors
            doctors={doctors}
            isLoading={doctorsLoading}
            specialty={currentSpecialty}
          />
        </div>
      )}
    </div>
  )
}

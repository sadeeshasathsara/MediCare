import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, AlertTriangle, ShieldCheck, Zap, AlertOctagon, RotateCcw, Stethoscope, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useSymptomChecker } from '@/features/ai-symptom/hooks/useSymptomChecker'
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

function AiMessage({ content, result, doctors, doctorsLoading }) {
  return (
    <div className="flex gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <Bot className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 space-y-4 max-w-[90%]">
        <div className="rounded-2xl rounded-tl-sm bg-card border border-border/60 p-5 shadow-sm text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {content}
        </div>

        {result?.isDiagnostic && (
          <div className="rounded-2xl border bg-card/40 backdrop-blur-sm p-6 space-y-6 shadow-md border-primary/10 animate-in zoom-in-95 duration-500">
            {/* Urgency */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Expert Assessment</span>
              <UrgencyBadge level={result.urgencyLevel} />
            </div>

            {/* Conditions */}
            {result.possibleConditions?.length > 0 && (
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Potential Indications</p>
                <div className="flex flex-wrap gap-2">
                  {result.possibleConditions.map((c, i) => (
                    <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-primary/5 text-primary border border-primary/10 font-semibold shadow-sm">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended specialty */}
            {result.recommendedSpecialty && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <Stethoscope size={16} className="text-primary" />
                <span className="text-xs font-medium text-muted-foreground italic">Recommended focus:</span>
                <span className="text-xs font-bold text-primary">{result.recommendedSpecialty}</span>
              </div>
            )}

            {/* Advice */}
            {result.advice && (
              <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/30 text-[13px] text-muted-foreground leading-relaxed italic">
                "{result.advice}"
              </div>
            )}

            {/* Recommended Doctors Card */}
            <div className="pt-2">
              <RecommendedDoctors
                doctors={doctors}
                isLoading={doctorsLoading}
                specialty={result.recommendedSpecialty}
              />
            </div>

            {/* Disclaimer */}
            {result.disclaimer && (
              <p className="text-[10px] text-muted-foreground/50 border-t border-border/50 pt-3 text-center">
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
    <div className="flex gap-3 items-start justify-end animate-in fade-in slide-in-from-right-2 duration-300">
      <div className="flex-1 max-w-[85%]">
        <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground p-5 text-[15px] shadow-lg shadow-primary/10 ml-auto leading-relaxed">
          {content}
        </div>
      </div>
      <div className="h-9 w-9 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <User className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start animate-pulse">
      <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Bot className="h-5 w-5 text-primary" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-card border border-border/60 p-5 shadow-sm">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function OptionChips({ options, onSelect, disabled }) {
  if (!options || options.length === 0) return null

  return (
    <div className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="h-9 w-9 shrink-0" /> {/* Spacer to align with AI messages */}
      <div className="flex flex-wrap gap-2 max-w-[90%]">
        {options.map((option, i) => {
          const isOther = option.toLowerCase().includes('other')
          return (
            <button
              key={i}
              onClick={() => onSelect(option, isOther)}
              disabled={disabled}
              className={`
                px-4 py-2.5 rounded-2xl text-[13px] font-medium 
                border transition-all duration-200 cursor-pointer
                hover:scale-[1.03] active:scale-[0.97]
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isOther
                  ? 'border-dashed border-muted-foreground/40 text-muted-foreground bg-muted/20 hover:bg-muted/40 hover:border-muted-foreground/60'
                  : 'border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary/40 shadow-sm'
                }
              `}
            >
              {isOther ? (
                <span className="flex items-center gap-1.5">
                  <MessageCircle size={14} />
                  {option}
                </span>
              ) : option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function calculateAge(dob) {
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return age
}

export default function SymptomChatBox({ profile, initialPrompt, isLocked }) {
  const {
    loading,
    error,
    messages,
    setMessages,
    result,
    recommendedDoctors,
    doctorLookupStatus,
    latestOptions,
    submitCheck
  } = useSymptomChecker()

  const [input, setInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(true)
  const bottomRef = useRef(null)
  const initializedRef = useRef(false)

  const performSubmit = async (text, currentHistory) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const userMsg = { role: 'user', content: trimmed }
    const newHistory = [...currentHistory, userMsg]

    // Add user message to UI immediately
    setMessages(newHistory)
    setInput('')
    setShowTextInput(true)

    try {
      const data = await submitCheck({
        symptoms: trimmed,
        age: profile?.dob ? calculateAge(profile.dob) : null,
        gender: profile?.gender || null
      }, newHistory)

      // When the assistant returns options, show chips and hide the textarea
      // unless the user explicitly chooses "Other".
      if (Array.isArray(data?.options) && data.options.length > 0) {
        setShowTextInput(false)
      } else {
        setShowTextInput(true)
      }
    } catch (err) {
      console.error('Symptom check failed:', err)
    }
  }

  // Initialize with welcome message if empty
  useEffect(() => {
    if (messages.length === 0 && !initializedRef.current) {
      initializedRef.current = true
      const name = profile?.name?.split(' ')[0] || 'there'
      const welcomeMsg = {
        role: 'assistant',
        content: `Hi ${name}! I'm your MediCare AI assistant 👋 Tell me how you're feeling today — describe any symptoms you're experiencing and I'll help recommend the right specialist for you.`
      }

      setMessages([welcomeMsg])

      // Auto-submit if navigated from dashboard hero
      if (initialPrompt && initialPrompt.trim()) {
         window.setTimeout(() => {
           performSubmit(initialPrompt.trim(), [welcomeMsg])
         }, 0)
      }
    }
  }, [profile, messages.length, setMessages, initialPrompt])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, latestOptions])

  const handleSend = () => {
    if (input.trim() && !loading) {
      performSubmit(input, messages)
    }
  }

  const handleOptionSelect = (option, isOther) => {
    if (isOther) {
      setShowTextInput(true)
      setInput('')
      // Focus the textarea after a tick
      setTimeout(() => {
        const textarea = document.querySelector('[data-symptom-input]')
        textarea?.focus()
      }, 100)
    } else {
      performSubmit(option, messages)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReset = () => {
    setMessages([])
    setInput('')
    setShowTextInput(true)
  }

  return (
    <div className="flex flex-col gap-6 transition-all duration-700 h-full w-full">
      {/* Chat window container */}
      <div className={`
        relative border border-primary/10 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-700 h-full
        ${isLocked ? 'rounded-[3rem] shadow-[0_40px_120px_rgba(var(--primary-rgb),0.2)]' : 'rounded-[2.5rem]'}
      `}>
        {/* Header decoration */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        {/* Messages area */}
        <div className={`
          flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent transition-all duration-700
          ${isLocked ? 'md:p-12' : ''}
        `}>
          {messages.map((msg, i) => (
            msg.role === 'assistant'
              ? <AiMessage
                key={i}
                content={msg.content}
                result={i === messages.length - 1 ? result : null}
                doctors={i === messages.length - 1 ? recommendedDoctors : []}
                doctorsLoading={i === messages.length - 1 && doctorLookupStatus === 'loading'}
              />
              : <UserMessage key={i} content={msg.content} />
          ))}

          {/* Option chips - shown after the last AI message */}
          {!loading && latestOptions.length > 0 && (
            <OptionChips
              options={latestOptions}
              onSelect={handleOptionSelect}
              disabled={loading}
            />
          )}

          {loading && <TypingIndicator />}
          <div ref={bottomRef} className="h-4" />
        </div>

        {/* Floating Error Bar */}
        {error && (
          <div className="mx-8 mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Input Bar Section */}
        <div className={`
           p-6 md:p-8 bg-gradient-to-t from-background via-background/80 to-transparent pt-12 transition-all duration-700
           ${isLocked ? 'pb-10 pt-16' : ''}
        `}>
          <div className={`relative mx-auto group transition-all duration-700 ${isLocked ? 'max-w-5xl' : 'max-w-3xl'}`}>
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />

            <div className="relative flex gap-3 p-2 rounded-[1.8rem] bg-card border border-border shadow-2xl items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full text-muted-foreground/40 hover:text-primary transition-colors shrink-0"
                onClick={handleReset}
                title="Reset Conversation"
              >
                <RotateCcw size={18} />
              </Button>

              <Textarea
                data-symptom-input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={showTextInput ? "Tell me how you're feeling today..." : "Select an option above or type here..."}
                className="min-h-[52px] max-h-32 resize-none flex-1 bg-transparent border-0 ring-0 focus-visible:ring-0 text-[15px] p-4 placeholder:text-muted-foreground/40"
                disabled={loading}
              />

              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                size="icon"
                className="h-12 w-12 rounded-full shrink-0 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 bg-primary hover:bg-primary/90"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send size={20} />}
              </Button>
            </div>
          </div>
          <p className="mt-4 text-[10px] text-center text-muted-foreground/40 font-medium tracking-tight uppercase tracking-widest">
            AI Triage Guidance • Not a Medical Diagnosis
          </p>
        </div>
      </div>
    </div>
  )
}

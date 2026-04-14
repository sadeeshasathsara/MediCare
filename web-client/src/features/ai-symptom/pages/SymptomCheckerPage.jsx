import { Sparkles } from 'lucide-react'
import { useSymptomChecker } from '@/features/ai-symptom/hooks/useSymptomChecker'
import SymptomCheckerForm from '@/features/ai-symptom/components/SymptomCheckerForm'
import SymptomResultCard from '@/features/ai-symptom/components/SymptomResultCard'

export default function SymptomCheckerPage() {
    const { loading, error, result, submitCheck } = useSymptomChecker()

    return (
        <div className="space-y-6">
            <header
                className="rounded-2xl border p-6"
                style={{
                    background: 'linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
                    borderColor: 'hsl(var(--border))',
                }}
            >
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' }}>
                    <Sparkles size={14} />
                    Patient AI Assistant
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                    AI Symptom Checker
                </h1>
                <p className="mt-2 text-sm md:text-base" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Enter your symptoms to receive an AI-powered triage summary with urgency guidance and next-step recommendations.
                </p>
            </header>

            <SymptomCheckerForm loading={loading} error={error} onSubmit={submitCheck} />

            <SymptomResultCard result={result} />
        </div>
    )
}

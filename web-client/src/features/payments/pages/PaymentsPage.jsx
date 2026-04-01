export default function PaymentsPage() {
    return (
        <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                Payments
            </h1>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                View payment history and invoices.
            </p>
        </div>
    )
}

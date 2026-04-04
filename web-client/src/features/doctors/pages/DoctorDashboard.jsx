export default function DoctorDashboard() {
    return (
        <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                Doctor Dashboard
            </h1>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Welcome. Review your schedule and manage patient requests here.
            </p>
        </div>
    )
}

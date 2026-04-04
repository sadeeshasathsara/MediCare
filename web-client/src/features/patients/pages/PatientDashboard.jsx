export default function PatientDashboard() {
    return (
        <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                Patient Dashboard
            </h1>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Welcome. Manage your appointments and profile from here.
            </p>
        </div>
    )
}

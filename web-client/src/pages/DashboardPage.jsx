import {
  Users,
  Stethoscope,
  CalendarCheck,
  Activity,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react'

const stats = [
  { label: 'Total Patients', value: '2,847', change: '+12%', icon: Users, color: '192 91% 36%' },
  { label: 'Active Doctors', value: '184', change: '+3%', icon: Stethoscope, color: '142 71% 45%' },
  { label: 'Appointments Today', value: '64', change: '+8%', icon: CalendarCheck, color: '262 60% 55%' },
  { label: 'System Health', value: '99.8%', change: 'Stable', icon: Activity, color: '25 95% 53%' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Welcome back! Here&apos;s an overview of today&apos;s activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border p-5 transition-shadow hover:shadow-md"
            style={{
              backgroundColor: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{ backgroundColor: `hsl(${stat.color} / 0.12)` }}
              >
                <stat.icon size={20} style={{ color: `hsl(${stat.color})` }} />
              </div>
              <span
                className="flex items-center text-xs font-medium px-2 py-1 rounded-full"
                style={{
                  backgroundColor: 'hsl(142 71% 45% / 0.1)',
                  color: 'hsl(142 71% 45%)',
                }}
              >
                <TrendingUp size={12} className="mr-1" />
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              {stat.value}
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div
          className="lg:col-span-2 rounded-xl border p-5"
          style={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Recent Appointments
            </h2>
            <button
              className="flex items-center text-sm font-medium transition-colors cursor-pointer"
              style={{ color: 'hsl(var(--primary))' }}
            >
              View all <ArrowUpRight size={14} className="ml-1" />
            </button>
          </div>

          <div className="space-y-3">
            {[
              { patient: 'Sarah Johnson', doctor: 'Dr. Smith', time: '09:00 AM', status: 'Completed' },
              { patient: 'Mike Chen', doctor: 'Dr. Patel', time: '10:30 AM', status: 'In Progress' },
              { patient: 'Emily Davis', doctor: 'Dr. Wilson', time: '11:00 AM', status: 'Upcoming' },
              { patient: 'James Brown', doctor: 'Dr. Lee', time: '02:00 PM', status: 'Upcoming' },
            ].map((apt, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b last:border-b-0"
                style={{ borderColor: 'hsl(var(--border))' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{
                      backgroundColor: 'hsl(var(--accent))',
                      color: 'hsl(var(--accent-foreground))',
                    }}
                  >
                    {apt.patient[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                      {apt.patient}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {apt.doctor} · {apt.time}
                    </p>
                  </div>
                </div>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor:
                      apt.status === 'Completed'
                        ? 'hsl(142 71% 45% / 0.1)'
                        : apt.status === 'In Progress'
                          ? 'hsl(25 95% 53% / 0.1)'
                          : 'hsl(var(--accent))',
                    color:
                      apt.status === 'Completed'
                        ? 'hsl(142 71% 45%)'
                        : apt.status === 'In Progress'
                          ? 'hsl(25 95% 53%)'
                          : 'hsl(var(--accent-foreground))',
                  }}
                >
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="rounded-xl border p-5"
          style={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
          }}
        >
          <h2 className="text-base font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
            Quick Actions
          </h2>
          <div className="space-y-2">
            {[
              { label: 'Book Appointment', path: '/appointments/book' },
              { label: 'Register Patient', path: '/patients/new' },
              { label: 'AI Symptom Check', path: '/symptom-checker' },
            ].map((action) => (
              <button
                key={action.label}
                className="flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'hsl(var(--secondary))',
                  color: 'hsl(var(--secondary-foreground))',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'
                  e.currentTarget.style.color = 'hsl(var(--accent-foreground))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--secondary))'
                  e.currentTarget.style.color = 'hsl(var(--secondary-foreground))'
                }}
              >
                <ArrowUpRight size={16} className="mr-2 opacity-50" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

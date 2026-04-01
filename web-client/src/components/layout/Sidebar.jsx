import { NavLink } from 'react-router-dom'
import {
  HeartPulse,
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarCheck,
  Video,
  CreditCard,
  Bell,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useMobile } from '@/hooks/useMobile'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Patients', icon: Users, path: '/patients' },
  { label: 'Doctors', icon: Stethoscope, path: '/doctors' },
  { label: 'Appointments', icon: CalendarCheck, path: '/appointments' },
  { label: 'Telemedicine', icon: Video, path: '/telemedicine' },
  { label: 'Payments', icon: CreditCard, path: '/payments' },
  { label: 'Notifications', icon: Bell, path: '/notifications' },
  { label: 'AI Symptom', icon: BrainCircuit, path: '/symptom-checker' },
  { label: 'Pending Doctors', icon: Stethoscope, path: '/admin/pending-doctors', adminOnly: true },
  { label: 'Create Admin', icon: Users, path: '/admin/create-admin', adminOnly: true },
]

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const isMobile = useMobile()

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-65'

  // Mobile overlay
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Drawer */}
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-65 border-r transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          style={{
            backgroundColor: 'hsl(var(--sidebar))',
            borderColor: 'hsl(var(--sidebar-border))',
          }}
        >
          <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </aside>
      </>
    )
  }

  return (
    <aside
      className={`hidden md:flex flex-col ${sidebarWidth} h-screen sticky top-0 border-r transition-all duration-300`}
      style={{
        backgroundColor: 'hsl(var(--sidebar))',
        borderColor: 'hsl(var(--sidebar-border))',
      }}
    >
      <SidebarContent collapsed={collapsed} />

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 mx-3 mb-3 rounded-lg transition-colors cursor-pointer"
        style={{ color: 'hsl(var(--sidebar-foreground))' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'hsl(var(--sidebar-accent))'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  )
}

function SidebarContent({ collapsed, onNavigate }) {
  const { user } = useAuth()
  const items = navItems.filter((i) => !i.adminOnly || user?.role === 'ADMIN')

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 h-16 px-5 border-b`} style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <HeartPulse size={26} style={{ color: 'hsl(var(--primary))' }} className="shrink-0" />
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
            MediCare
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''
              } ${isActive ? 'sidebar-link-active' : 'sidebar-link'}`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'hsl(var(--sidebar-accent))' : 'transparent',
              color: isActive ? 'hsl(var(--sidebar-accent-foreground))' : 'hsl(var(--sidebar-foreground) / 0.7)',
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.classList.contains('sidebar-link-active')) {
                e.currentTarget.style.backgroundColor = 'hsl(var(--sidebar-accent) / 0.5)'
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.classList.contains('sidebar-link-active')) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

import { NavLink, useLocation } from 'react-router-dom'
import { useMemo, useState } from 'react'
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
  CalendarDays,
} from 'lucide-react'
import { useMobile } from '@/hooks/useMobile'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Appointments', icon: CalendarCheck, path: '/appointments' },
  { label: 'Telemedicine', icon: Video, path: '/telemedicine' },
  { label: 'Payments', icon: CreditCard, path: '/payments' },
  { label: 'Notifications', icon: Bell, path: '/notifications' },
  { label: 'AI Symptom', icon: BrainCircuit, path: '/symptom-checker' },
  { label: 'My Schedule', icon: CalendarDays, path: '/doctor/availability', doctorOnly: true },
  {
    id: 'user-management',
    label: 'User Management',
    icon: Users,
    adminOnly: true,
    children: [
      { label: 'Admins', icon: Users, path: '/admin/create-admin' },
      { label: 'Patients', icon: Users, path: '/patients' },
      {
        id: 'user-management-doctors',
        label: 'Doctors',
        icon: Stethoscope,
        children: [{ label: 'Pending Doctors', icon: Stethoscope, path: '/admin/pending-doctors' }],
      },
    ],
  },
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
  const location = useLocation()

  const items = useMemo(() => {
    const allowAdmin = user?.role === 'ADMIN'

    const filterTree = (nodes) => {
      const out = []
      for (const n of nodes) {
        if (n.adminOnly && !allowAdmin) continue
        if (n.doctorOnly && user?.role !== 'DOCTOR') continue
        
        if (Array.isArray(n.children) && n.children.length > 0) {
          const next = { ...n, children: filterTree(n.children) }
          out.push(next)
        } else {
          out.push(n)
        }
      }
      return out
    }

    return filterTree(navItems)
  }, [user?.role])

  const isNodeActive = useMemo(() => {
    const pathname = location.pathname
    const visit = (node) => {
      if (node?.path && node.path === pathname) return true
      if (Array.isArray(node?.children)) return node.children.some(visit)
      return false
    }
    return visit
  }, [location.pathname])

  const forcedOpen = useMemo(() => {
    const pathname = location.pathname
    return {
      'user-management': pathname.startsWith('/admin/'),
      'user-management-doctors': pathname === '/admin/pending-doctors',
    }
  }, [location.pathname])

  const [openGroups, setOpenGroups] = useState({})

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev?.[groupId] }))
  }

  const renderNode = (node, depth = 0) => {
    const hasChildren = Array.isArray(node?.children) && node.children.length > 0
    const groupId = node?.id
    const isSubtab = depth > 0
    const textSizeClass = isSubtab ? 'text-xs' : 'text-sm'
    const paddingYClass = isSubtab ? 'py-2' : 'py-2.5'
    const gapClass = isSubtab ? 'gap-2' : 'gap-3'
    const iconSize = isSubtab ? 18 : 20
    const chevronSize = isSubtab ? 16 : 18

    if (hasChildren) {
      const active = isNodeActive(node)
      const isOpen = !!forcedOpen?.[groupId] || !!openGroups?.[groupId]
      const leftPadding = collapsed ? undefined : 12 + depth * 16

      return (
        <div key={groupId || node.label}>
          <button
            type="button"
            onClick={() => {
              if (groupId) toggleGroup(groupId)
            }}
            className={
              `w-full flex items-center ${gapClass} px-3 ${paddingYClass} rounded-lg ${textSizeClass} font-medium transition-colors ${collapsed ? 'justify-center' : ''}`
            }
            style={{
              paddingLeft: leftPadding,
              backgroundColor: active ? 'hsl(var(--sidebar-accent))' : 'transparent',
              color: active ? 'hsl(var(--sidebar-accent-foreground))' : 'hsl(var(--sidebar-foreground) / 0.7)',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.backgroundColor = 'hsl(var(--sidebar-accent) / 0.5)'
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            <node.icon size={iconSize} className="shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{node.label}</span>
                {groupId ? (
                  <ChevronRight
                    size={chevronSize}
                    className={`shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  />
                ) : null}
              </>
            )}
          </button>

          {!collapsed && isOpen ? (
            <div className="mt-1 space-y-1">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          ) : null}
        </div>
      )
    }

    const leftPadding = collapsed ? undefined : 12 + depth * 16
    return (
      <NavLink
        key={node.path}
        to={node.path}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center ${gapClass} px-3 ${paddingYClass} rounded-lg ${textSizeClass} font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'sidebar-link-active' : 'sidebar-link'}`
        }
        style={({ isActive }) => ({
          paddingLeft: leftPadding,
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
        <node.icon size={iconSize} className="shrink-0" />
        {!collapsed && <span>{node.label}</span>}
      </NavLink>
    )
  }

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
        {items.map((item) => renderNode(item, 0))}
      </nav>
    </div>
  )
}

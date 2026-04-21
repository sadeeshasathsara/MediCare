import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useMobile } from '@/hooks/useMobile'
import { downloadPatientProfilePhoto } from '@/features/patients/services/patientApi'
import {
  emitNotificationsUpdated,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_POLL_INTERVAL_MS,
} from '@/features/notifications/services/notificationApi'
import {
  formatNotificationTime,
  getAppointmentReason,
  getEventLabel,
  getNotificationTargetPath,
  isNotificationRead,
} from '@/features/notifications/services/notificationUtils'
import { Sun, Moon, Menu, LogOut, User, ChevronDown, HeartPulse, X, Bell, CheckCheck } from 'lucide-react'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

export default function Navbar({ onMenuClick, showMenuButton = true, showLogo = false, navLinks = [] }) {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useMobile()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationItems, setNotificationItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef(null)
  const notificationRef = useRef(null)

  const notificationsEnabled = user?.role === 'DOCTOR' || user?.role === 'PATIENT'
  const notificationsRoute = user?.role === 'DOCTOR' ? '/doctor/notifications' : '/patient/notifications'

  const profilePath = useMemo(() => {
    const role = user?.role
    if (role === 'PATIENT') return '/patient/profile'
    if (role === 'DOCTOR') return '/doctor/profile'
    return null
  }, [user?.role])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    let cancelled = false
    let objectUrlToRevoke = ''

    async function loadAvatar() {
      const role = user?.role
      const userId = user?.id

      // Currently only patient-service provides a profile-photo endpoint.
      if (!userId || role !== 'PATIENT') {
        setAvatarUrl('')
        return
      }

      try {
        const res = await downloadPatientProfilePhoto(userId)
        if (cancelled) return

        objectUrlToRevoke = URL.createObjectURL(res.data)
        setAvatarUrl(objectUrlToRevoke)
      } catch {
        if (cancelled) return
        setAvatarUrl('')
      }
    }

    loadAvatar()

    function handleUpdated() {
      loadAvatar()
    }

    window.addEventListener('profile-photo-updated', handleUpdated)

    return () => {
      cancelled = true
      window.removeEventListener('profile-photo-updated', handleUpdated)
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke)
    }
  }, [user?.id, user?.role])

  const loadUnreadCount = useCallback(async () => {
    if (!notificationsEnabled) {
      setUnreadCount(0)
      return
    }

    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch {
      // Keep previous count on transient failures.
    }
  }, [notificationsEnabled])

  const loadNotificationPreview = useCallback(async () => {
    if (!notificationsEnabled) {
      setNotificationItems([])
      return
    }

    setNotificationLoading(true)
    try {
      const result = await listNotifications({ page: 0, size: 5, readState: 'all' })
      setNotificationItems(Array.isArray(result?.items) ? result.items : [])
    } catch {
      setNotificationItems([])
    } finally {
      setNotificationLoading(false)
    }
  }, [notificationsEnabled])

  useEffect(() => {
    if (!notificationsEnabled) return undefined

    loadUnreadCount()
    const id = window.setInterval(() => {
      loadUnreadCount()
    }, NOTIFICATION_POLL_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [loadUnreadCount, notificationsEnabled])

  useEffect(() => {
    if (!notificationsEnabled) return
    loadUnreadCount()
  }, [location.pathname, loadUnreadCount, notificationsEnabled])

  useEffect(() => {
    if (!notificationsEnabled) return undefined

    function onFocus() {
      loadUnreadCount()
      if (notificationOpen) {
        loadNotificationPreview()
      }
    }

    function onNotificationsUpdated() {
      loadUnreadCount()
      if (notificationOpen) {
        loadNotificationPreview()
      }
    }

    window.addEventListener('focus', onFocus)
    window.addEventListener('notifications-updated', onNotificationsUpdated)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('notifications-updated', onNotificationsUpdated)
    }
  }, [loadNotificationPreview, loadUnreadCount, notificationOpen, notificationsEnabled])

  const handleToggleNotifications = async () => {
    const nextOpen = !notificationOpen
    setNotificationOpen(nextOpen)
    if (nextOpen) {
      await loadNotificationPreview()
    }
  }

  const handleOpenNotification = async (item) => {
    if (!item) return

    const read = isNotificationRead(item)
    if (!read) {
      try {
        await markNotificationRead(item.id)
      } catch {
        // Non-blocking; navigation should still proceed.
      }
    }

    emitNotificationsUpdated()
    setNotificationOpen(false)
    navigate(getNotificationTargetPath(item, user?.role))
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      emitNotificationsUpdated()
      await loadNotificationPreview()
    } catch {
      // Non-blocking action.
    }
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center h-16 px-4 md:px-6 border-b backdrop-blur-md relative"
      style={{
        backgroundColor: 'hsl(var(--card) / 0.85)',
        borderColor: 'hsl(var(--border))',
      }}
    >
      {/* Mobile menu button for Sidebar overrides */}
      {showMenuButton && isMobile && (
        <button
          onClick={onMenuClick}
          className="p-2 mr-2 rounded-lg transition-colors cursor-pointer"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          <Menu size={22} />
        </button>
      )}

      {/* Logo for TopNavLayout */}
      {showLogo && (
        <Link to="/" className="flex items-center gap-2 mr-8 transition-opacity hover:opacity-80">
          <HeartPulse size={26} style={{ color: 'hsl(var(--primary))' }} />
          <span className="text-lg font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
            MediCare
          </span>
        </Link>
      )}

      {/* Primary Navigation - Desktop */}
      {navLinks.length > 0 && !isMobile && (
        <nav className="flex items-center gap-6 mr-6">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Mobile menu button for TopNavLayout */}
        {!showMenuButton && navLinks.length > 0 && isMobile && (
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 mr-2 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        )}

        {notificationsEnabled && (
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={handleToggleNotifications}
              className="relative p-2.5 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'hsl(var(--muted-foreground))' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'
                e.currentTarget.style.color = 'hsl(var(--accent-foreground))'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'hsl(var(--muted-foreground))'
              }}
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 rounded-lg border shadow-lg py-2 z-50"
                style={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderColor: 'hsl(var(--border))',
                  color: 'hsl(var(--popover-foreground))',
                }}
              >
                <div className="flex items-center justify-between px-3 pb-2">
                  <p className="text-sm font-semibold">Notifications</p>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 transition hover:bg-black/[0.05]"
                        style={{ color: 'hsl(var(--primary))' }}
                      >
                        <CheckCheck size={12} />
                        Mark all
                      </button>
                    )}
                    <Link
                      to={notificationsRoute}
                      onClick={() => setNotificationOpen(false)}
                      className="text-xs font-medium"
                      style={{ color: 'hsl(var(--primary))' }}
                    >
                      View all
                    </Link>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notificationLoading ? (
                    <p className="px-3 py-6 text-xs text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Loading notifications...
                    </p>
                  ) : null}

                  {!notificationLoading && notificationItems.length === 0 ? (
                    <p className="px-3 py-6 text-xs text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      No notifications yet.
                    </p>
                  ) : null}

                  {!notificationLoading && notificationItems.map((item) => {
                    const read = isNotificationRead(item)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleOpenNotification(item)}
                        className="w-full text-left px-3 py-2 transition hover:bg-black/[0.04]"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: read ? 'hsl(var(--muted))' : 'hsl(var(--primary))' }}
                          />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
                              {getEventLabel(item.eventType)}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                              {getAppointmentReason(item)}
                            </p>
                            <p className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                              {formatNotificationTime(item.occurredAt || item.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-lg transition-colors cursor-pointer"
          style={{ color: 'hsl(var(--muted-foreground))' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'
            e.currentTarget.style.color = 'hsl(var(--accent-foreground))'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'hsl(var(--muted-foreground))'
          }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'hsl(var(--foreground))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium"
              style={{
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                user?.name?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            {!isMobile && (
              <>
                <span className="text-sm font-medium max-w-[120px] truncate">
                  {user?.name || 'Guest'}
                </span>
                <ChevronDown size={16} className="opacity-50" />
              </>
            )}
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-48 rounded-lg border shadow-lg py-1 z-50"
              style={{
                backgroundColor: 'hsl(var(--popover))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--popover-foreground))',
              }}
            >
              {profilePath ? (
                <Link
                  to={profilePath}
                  onClick={() => {
                    setDropdownOpen(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors cursor-pointer"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <User size={16} />
                  Profile
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
                  style={{ color: 'hsl(var(--muted-foreground))', cursor: 'default' }}
                  disabled
                >
                  <User size={16} />
                  Profile
                </button>
              )}
              <div className="h-px mx-2 my-1" style={{ backgroundColor: 'hsl(var(--border))' }} />
              <button
                onClick={() => { logout(); setDropdownOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors cursor-pointer"
                style={{ color: 'hsl(var(--destructive))' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--destructive) / 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile TopNav Dropdown */}
      {!showMenuButton && navLinks.length > 0 && isMobile && mobileNavOpen && (
        <div
          className="absolute top-16 left-0 right-0 border-b shadow-lg p-4 flex flex-col gap-4 z-40"
          style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                `text-base font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-foreground'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  )
}

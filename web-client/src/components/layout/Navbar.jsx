import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useMobile } from '@/hooks/useMobile'
import { Sun, Moon, Menu, LogOut, User, ChevronDown, HeartPulse, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'

export default function Navbar({ onMenuClick, showMenuButton = true, showLogo = false, navLinks = [] }) {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const isMobile = useMobile()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
              {user?.name?.[0]?.toUpperCase() || 'U'}
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
              <button
                onClick={() => { setDropdownOpen(false) }}
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
              </button>
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

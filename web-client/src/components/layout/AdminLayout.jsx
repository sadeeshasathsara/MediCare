import { useState } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useLocalStorage('medicare-sidebar-collapsed', false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setMobileOpen(true)} showMenuButton={true} showLogo={false} />

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

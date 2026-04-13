import Navbar from './Navbar'

export default function TopNavLayout({ children, navLinks = [] }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar showMenuButton={false} showLogo={true} navLinks={navLinks} />
      <main className="flex-1 w-full  mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}

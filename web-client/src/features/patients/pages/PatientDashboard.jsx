import React, { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '@/context/AuthContext'
import { getPatientProfile } from '@/features/patients/services/patientApi'
import AiSymptomHero from '@/features/ai-symptom/components/AiSymptomHero'
import AppointmentsList from '@/features/appointments/components/AppointmentsList'
import { fetchAppointments, selectAppointmentsQuery, cancelAppointmentById } from '@/store/slices/appointmentsSlice'
import { Button } from '@/components/ui/button'
import { CalendarIcon, ChevronRight } from 'lucide-react'

export default function PatientDashboard() {
  const { user } = useAuth()
  const dispatch = useDispatch()
  const [profile, setProfile] = useState(null)
  const userId = user?.id || ''
  const [cancelingId, setCancelingId] = useState(null)

  useEffect(() => {
    if (userId) {
      getPatientProfile(userId).then(setProfile).catch(() => null)
    }
  }, [userId])

  const upcomingParams = useMemo(() => ({ patientId: userId, filter: 'UPCOMING', limit: 4 }), [userId])
  const upcomingQuery = useSelector((state) => selectAppointmentsQuery(state, upcomingParams))

  useEffect(() => {
    if (userId && upcomingQuery.status === 'idle') {
      dispatch(fetchAppointments({ params: upcomingParams }))
    }
  }, [dispatch, userId, upcomingParams, upcomingQuery.status])

  const handleStatusUpdate = async (id, status) => {
    try {
      if (status === 'CANCELLED') {
        setCancelingId(id)
        await dispatch(cancelAppointmentById(id)).unwrap()
      }
    } catch (error) {
      console.error('Failed to cancel:', error)
    } finally {
      if (status === 'CANCELLED') setCancelingId(null)
    }
  }

  const displayName = profile?.name || user?.name || 'there'
  const isInitialLoading = upcomingQuery.status === 'loading' && !upcomingQuery.items.length

  return (
    <div className="max-w-6xl mx-auto pb-24 animate-in fade-in duration-500 space-y-12">
      <AiSymptomHero userName={displayName} />

      {/* Quick Actions Section */}
      <section className="px-6 md:px-0 mt-8 mb-10">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 ml-1">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <RouterLink to="/patient/book" className="group rounded-2xl p-5 border bg-card hover:bg-primary/5 hover:border-primary/30 hover:shadow-md transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <CalendarIcon size={20} />
            </div>
            <h3 className="mt-4 font-semibold text-foreground text-sm">Book Doctor</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Schedule a consultation</p>
          </RouterLink>

          <RouterLink to="/patient/symptom-checker" className="group rounded-2xl p-5 border bg-card hover:bg-blue-500/5 hover:border-blue-500/30 hover:shadow-md transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            </div>
            <h3 className="mt-4 font-semibold text-foreground text-sm">AI Checker</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Self-diagnose symptoms</p>
          </RouterLink>

          <RouterLink to="/patient/profile" className="group rounded-2xl p-5 border bg-card hover:bg-emerald-500/5 hover:border-emerald-500/30 hover:shadow-md transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h3 className="mt-4 font-semibold text-foreground text-sm">My Profile</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Manage medical records</p>
          </RouterLink>

          <RouterLink to="/appointments" className="group rounded-2xl p-5 border bg-card hover:bg-amber-500/5 hover:border-amber-500/30 hover:shadow-md transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
            </div>
            <h3 className="mt-4 font-semibold text-foreground text-sm">History</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">View past visits</p>
          </RouterLink>
        </div>
      </section>

      {/* Upcoming Appointments Section */}
      <section className="px-6 md:px-0 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-primary">
            <CalendarIcon className="h-6 w-6" />
            <h2 className="text-2xl font-bold text-foreground">Upcoming Appointments</h2>
          </div>
          <Button variant="ghost" asChild className="hidden sm:flex group">
            <RouterLink to="/appointments">
              View All
              <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </RouterLink>
          </Button>
        </div>

        <div className="bg-card border rounded-3xl p-6 shadow-sm">
          {upcomingQuery.error && (
            <div className="p-3 mb-4 bg-red-100 text-red-600 rounded">Error: {upcomingQuery.error}</div>
          )}

          <AppointmentsList
            appointments={upcomingQuery.items?.slice(0, 4) || []}
            handleStatusUpdate={handleStatusUpdate}
            isDoctor={false}
            cancelingId={cancelingId}
            hasMore={false} /* Don't allow load more on dashboard, let them go to the main page */
            isLoadingMore={false}
            isInitialLoading={isInitialLoading}
          />

          <div className="mt-6 sm:hidden border-t pt-4">
            <Button variant="outline" className="w-full" asChild>
              <RouterLink to="/appointments">
                See All Appointments
              </RouterLink>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

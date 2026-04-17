import React, { useEffect, useState } from 'react'
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

  const upcomingParams = { patientId: userId, filter: 'UPCOMING', limit: 4 }
  const upcomingQuery = useSelector((state) => selectAppointmentsQuery(state, upcomingParams))

  useEffect(() => {
    if (userId && upcomingQuery.status === 'idle') {
      dispatch(fetchAppointments({ params: upcomingParams }))
    }
  }, [dispatch, userId, upcomingQuery.status])

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
              <RouterLink to="/patient/appointments">
                See All Appointments
              </RouterLink>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

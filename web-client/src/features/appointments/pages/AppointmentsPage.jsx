import React, { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '@/context/AuthContext'
import AppointmentsList from '../components/AppointmentsList'
import {
  fetchAppointments,
  selectAppointmentsByParams,
  selectAppointmentsStatusByParams,
  updateAppointmentStatusById,
} from '@/store/slices/appointmentsSlice'

export default function AppointmentsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()

  const queryParams = useMemo(() => {
    if (!user?.id) return {}
    return user.role === 'DOCTOR' ? { doctorId: user.id } : { patientId: user.id }
  }, [user?.id, user?.role])

  const appointments = useSelector((state) => selectAppointmentsByParams(state, queryParams))
  const status = useSelector((state) => selectAppointmentsStatusByParams(state, queryParams))
  const loading = status === 'idle' || status === 'loading'

  useEffect(() => {
    if (!user?.id) return
    dispatch(fetchAppointments({ params: queryParams }))
  }, [dispatch, queryParams, user?.id])

  const handleStatusUpdate = async (id, status) => {
    try {
      await dispatch(updateAppointmentStatusById({ appointmentId: id, status })).unwrap()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center animate-pulse text-muted-foreground font-medium">
        Loading your appointments...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground text-sm">
          Manage your schedule, confirmations, and general consultation
          requests.
        </p>
      </div>

      <AppointmentsList
        appointments={appointments}
        handleStatusUpdate={handleStatusUpdate}
        isDoctor={user?.role === 'DOCTOR'}
      />
    </div>
  )
}

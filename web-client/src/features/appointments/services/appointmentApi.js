import api from '@/services/api'

export const getAppointmentById = async (id) => {
  const { data } = await api.get(`/appointments/${id}`)
  return data
}

export const getAppointments = async (params) => {
  const query = new URLSearchParams(params).toString()
  const { data } = await api.get(`/appointments?${query}`)
  return data
}

export const createAppointment = async (payload) => {
  const { data } = await api.post('/appointments', payload)
  return data
}

export const updateAppointmentStatus = async (appointmentId, status) => {
  const { data } = await api.patch(`/appointments/${appointmentId}/status`, { status })
  return data
}

export const cancelAppointment = async (appointmentId) => {
  const { data } = await api.delete(`/appointments/${appointmentId}`)
  return data
}

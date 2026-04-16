import api from '@/services/api'

export const listDoctors = async (params = {}) => {
  const { data } = await api.get('/doctors', { params })
  return data
}

export const listDoctorSpecialties = async () => {
  const { data } = await api.get('/doctors/specialties')
  return data
}

export const getDoctorByUserId = async (id) => {
  const { data } = await api.get(`/doctors/${id}`)
  return data
}

export const getDoctorAvailability = async (doctorId) => {
  const { data } = await api.get(`/doctors/${doctorId}/availability`)
  return data
}

export const createDoctorAvailability = async (doctorId, payload) => {
  const { data } = await api.post(`/doctors/${doctorId}/availability`, payload)
  return data
}

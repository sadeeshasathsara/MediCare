import api from '@/services/api'

export const getDoctorByUserId = async (id) => {
  const { data } = await api.get(`/doctors/doctors/${id}`)
  return data
}

export const getDoctorAvailability = async (doctorId) => {
  const { data } = await api.get(`/doctors/doctors/${doctorId}/availability`)
  return data
}

export const createDoctorAvailability = async (doctorId, payload) => {
  const { data } = await api.post(`/doctors/doctors/${doctorId}/availability`, payload)
  return data
}

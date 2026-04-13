import api from '@/services/api'

export const getDoctors = async (specialty) => {
    const url = specialty ? `/api/doctors?specialty=${encodeURIComponent(specialty)}` : '/api/doctors'
    const response = await api.get(url)
    return response.data
}

export const getDoctorById = async (id) => {
    const response = await api.get(`/api/doctors/${id}`)
    return response.data
}

export const getDoctorAvailability = async (id) => {
    const response = await api.get(`/api/doctors/${id}/availability`)
    return response.data
}

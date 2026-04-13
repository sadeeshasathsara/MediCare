import api from '@/services/api'

export const getAppointments = async (params) => {
    const query = new URLSearchParams(params).toString()
    const response = await api.get(`/api/appointments?${query}`)
    return response.data
}

export const createAppointment = async (data) => {
    const response = await api.post('/api/appointments', data)
    return response.data
}

export const updateAppointmentStatus = async (id, status) => {
    const response = await api.put(`/api/appointments/${id}/status`, { status })
    return response.data
}

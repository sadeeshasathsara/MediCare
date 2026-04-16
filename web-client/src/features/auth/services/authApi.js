import api from '@/services/api'

export async function loginWithEmailPassword(email, password) {
    const res = await api.post('/auth/login', { email, password })
    return res.data
}

export async function registerPatient(email, password) {
    const res = await api.post('/auth/register', { email, password })
    return res.data
}

export async function changeMyEmail(email) {
    const res = await api.patch('/auth/me/email', { email })
    return res.data
}

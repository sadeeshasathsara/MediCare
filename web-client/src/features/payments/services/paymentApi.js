import api from '@/services/api'

export async function createPaymentIntent(userId, payload) {
    const { data } = await api.post(`/payments/payments/users/${encodeURIComponent(userId)}/intent`, payload)
    return data
}

export async function confirmPayment(userId, payload) {
    const { data } = await api.post(`/payments/payments/users/${encodeURIComponent(userId)}/confirm`, payload)
    return data
}

export async function listUserPayments(userId) {
    const { data } = await api.get(`/payments/payments/users/${encodeURIComponent(userId)}`)
    return data
}

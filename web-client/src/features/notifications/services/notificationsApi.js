import api from '@/services/api'

const NOTIFICATIONS_BASE = '/notifications'

export async function listMyNotifications(params = {}) {
    const page = params.page ?? 0
    const size = params.size ?? 20
    const type = params.type ?? undefined
    const status = params.status ?? undefined

    const search = new URLSearchParams()
    search.set('page', String(page))
    search.set('size', String(size))
    if (type) search.set('type', String(type))
    if (status) search.set('status', String(status))

    const { data } = await api.get(`${NOTIFICATIONS_BASE}/me?${search.toString()}`)
    return data
}

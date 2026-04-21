import api from '@/services/api'

export const NOTIFICATION_POLL_INTERVAL_MS = 20000

export async function listNotifications(params = {}) {
  const response = await api.get('/notifications/me', { params })
  return response?.data || {
    items: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
  }
}

export async function getUnreadCount() {
  const response = await api.get('/notifications/me/unread-count')
  return Number(response?.data?.count || 0)
}

export async function markNotificationRead(notificationId) {
  if (!notificationId) return
  await api.patch(`/notifications/${notificationId}/read`)
}

export async function markAllNotificationsRead() {
  const response = await api.patch('/notifications/me/read-all')
  return Number(response?.data?.markedRead || 0)
}

export function emitNotificationsUpdated() {
  window.dispatchEvent(new Event('notifications-updated'))
}


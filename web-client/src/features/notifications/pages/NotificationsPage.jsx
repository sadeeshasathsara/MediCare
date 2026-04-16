import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Check, CheckCheck, RefreshCw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import {
  emitNotificationsUpdated,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/services/notificationApi'
import {
  formatNotificationTime,
  getAppointmentReason,
  getCounterpartName,
  getEventLabel,
  getNotificationTargetPath,
  isNotificationRead,
} from '@/features/notifications/services/notificationUtils'

const READ_STATES = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Read', value: 'read' },
]

const EVENT_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Requested', value: 'APPOINTMENT_REQUESTED' },
  { label: 'Confirmed', value: 'APPOINTMENT_CONFIRMED' },
  { label: 'Rescheduled', value: 'APPOINTMENT_RESCHEDULED' },
  { label: 'Cancelled', value: 'APPOINTMENT_CANCELLED' },
  { label: 'Completed', value: 'APPOINTMENT_COMPLETED' },
  { label: 'Telemedicine Accepted', value: 'TELEMEDICINE_APPOINTMENT_ACCEPTED' },
  { label: 'Telemedicine Rejected', value: 'TELEMEDICINE_APPOINTMENT_REJECTED' },
  { label: 'Telemedicine Rescheduled', value: 'TELEMEDICINE_APPOINTMENT_RESCHEDULED' },
  { label: 'Telemedicine Completed', value: 'TELEMEDICINE_CONSULTATION_COMPLETED' },
  { label: 'Prescription Issued', value: 'TELEMEDICINE_PRESCRIPTION_ISSUED' },
]

function buildTitle(notification, userRole) {
  const counterpart = getCounterpartName(notification, userRole)
  const label = getEventLabel(notification?.eventType)
  return `${label} - ${counterpart}`
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [pageMeta, setPageMeta] = useState({
    size: 20,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
  })
  const [readState, setReadState] = useState('all')
  const [eventType, setEventType] = useState('')
  const [markingAll, setMarkingAll] = useState(false)

  const role = user?.role
  const focusId = useMemo(() => new URLSearchParams(location.search).get('focus'), [location.search])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await listNotifications({
        page,
        size: pageMeta.size,
        readState,
        type: eventType || undefined,
      })
      setItems(Array.isArray(result?.items) ? result.items : [])
      setPageMeta({
        size: Number(result?.size || 20),
        totalElements: Number(result?.totalElements || 0),
        totalPages: Number(result?.totalPages || 0),
        hasNext: Boolean(result?.hasNext),
      })
    } catch {
      setError('Unable to load notifications right now.')
    } finally {
      setLoading(false)
    }
  }, [eventType, page, pageMeta.size, readState])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const handleMarkRead = useCallback(async (notificationId) => {
    try {
      await markNotificationRead(notificationId)
      setItems((prev) => prev.map((item) => {
        if (item.id !== notificationId) return item
        return {
          ...item,
          read: true,
          readAt: new Date().toISOString(),
        }
      }))
      emitNotificationsUpdated()
    } catch {
      // Keep silent here; user can retry from refresh action.
    }
  }, [])

  const handleMarkAll = useCallback(async () => {
    setMarkingAll(true)
    try {
      await markAllNotificationsRead()
      emitNotificationsUpdated()
      await loadNotifications()
    } finally {
      setMarkingAll(false)
    }
  }, [loadNotifications])

  const unreadCount = useMemo(() => items.filter((item) => !isNotificationRead(item)).length, [items])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
            Notifications
          </h1>
          <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Appointment activity feed for your account.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadNotifications}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-black/[0.03]"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={markingAll || unreadCount === 0}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-50"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          >
            <CheckCheck size={15} />
            Mark All Read
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <select
          value={readState}
          onChange={(e) => {
            setPage(0)
            setReadState(e.target.value)
          }}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
        >
          {READ_STATES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select
          value={eventType}
          onChange={(e) => {
            setPage(0)
            setEventType(e.target.value)
          }}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
        >
          {EVENT_TYPES.map((option) => (
            <option key={option.value || 'all-types'} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {error ? (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive))', backgroundColor: 'hsl(var(--destructive) / 0.07)' }}
        >
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <div
            className="rounded-2xl border px-4 py-10 text-center text-sm"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))', backgroundColor: '#ffffff' }}
          >
            Loading notifications...
          </div>
        ) : null}

        {!loading && items.length === 0 ? (
          <div
            className="rounded-2xl border px-4 py-10 text-center text-sm"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))', backgroundColor: '#ffffff' }}
          >
            No notifications found for the selected filters.
          </div>
        ) : null}

        {!loading && items.map((item) => {
          const read = isNotificationRead(item)
          const target = getNotificationTargetPath(item, role)
          const highlighted = focusId && String(item?.id) === String(focusId)

          return (
            <div
              key={item.id}
              className="rounded-2xl border p-4 transition"
              style={{
                borderColor: highlighted ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                backgroundColor: '#ffffff',
                boxShadow: highlighted ? '0 0 0 2px hsl(var(--primary) / 0.15)' : 'none',
              }}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                      {getEventLabel(item.eventType)}
                    </span>
                    {!read ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-[11px] font-semibold text-sky-700">
                        <Bell size={11} />
                        New
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        <Check size={11} />
                        Read
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                    {buildTitle(item, role)}
                  </p>
                  <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {getAppointmentReason(item)}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-2 md:items-end">
                  <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {formatNotificationTime(item.occurredAt || item.createdAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    {!read ? (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(item.id)}
                        className="rounded-md border px-2.5 py-1 text-xs font-medium transition hover:bg-black/[0.03]"
                        style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                      >
                        Mark Read
                      </button>
                    ) : null}
                    <Link
                      to={target}
                      onClick={() => {
                        if (!read) {
                          handleMarkRead(item.id)
                        }
                      }}
                      className="rounded-md border px-2.5 py-1 text-xs font-medium transition hover:bg-black/[0.03]"
                      style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    >
                      Open
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Showing page {page + 1} of {Math.max(1, pageMeta.totalPages || 1)}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            disabled={page === 0 || loading}
            className="rounded-md border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!pageMeta.hasNext || loading}
            className="rounded-md border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

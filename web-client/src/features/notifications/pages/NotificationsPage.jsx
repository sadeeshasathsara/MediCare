import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { listMyNotifications } from '@/features/notifications/services/notificationsApi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function formatTimestamp(value) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString()
}

export default function NotificationsPage() {
    const navigate = useNavigate()
    const { user } = useAuth()

    const isDoctor = user?.role === 'DOCTOR'
    const appointmentPrefix = isDoctor ? '/doctor/appointments' : '/appointments'

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [page, setPage] = useState(0)
    const [data, setData] = useState({ items: [], hasNext: false })

    const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data])

    const fetchNotifications = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const response = await listMyNotifications({ page, size: 20 })
            setData(response || { items: [], hasNext: false })
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to load notifications')
        } finally {
            setLoading(false)
        }
    }, [page])

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
                    <p className="text-sm text-muted-foreground">View your notifications.</p>
                </div>
                <Button variant="outline" className="cursor-pointer" onClick={fetchNotifications} disabled={loading}>
                    Refresh
                </Button>
            </div>

            {error ? <div className="text-sm text-destructive">{error}</div> : null}

            {loading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map((idx) => (
                        <Card key={idx}>
                            <CardHeader className="pb-3">
                                <Skeleton className="h-5 w-60" />
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">No notifications yet</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        You’ll see appointment updates and telemedicine events here.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {items.map((n) => (
                        <Card key={n.id} className="border-muted/60">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold">{n.subject || n.eventType || 'Notification'}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-sm text-muted-foreground">{n.summary || '-'}</p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>Status: {n.status || '-'}</span>
                                    <span>•</span>
                                    <span>When: {formatTimestamp(n.occurredAt || n.createdAt)}</span>
                                </div>
                                {n.appointmentId ? (
                                    <div className="pt-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="cursor-pointer"
                                            onClick={() => navigate(`${appointmentPrefix}/${n.appointmentId}`)}
                                        >
                                            View appointment
                                        </Button>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-end gap-2">
                <Button
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={loading || page <= 0}
                >
                    Prev
                </Button>
                <Button
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loading || !data?.hasNext}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}

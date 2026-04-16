import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointmentStatus,
    cancelAppointment,
} from '@/features/appointments/services/appointmentApi'

const EMPTY_QUERY = { items: [], status: 'idle', error: null, lastFetched: 0 }

function serializeParams(params = {}) {
    const entries = Object.entries(params || {})
        .filter(([key, value]) => value !== undefined && value !== null && value !== '' && key !== 'page' && key !== 'limit' && key !== 'isLoadMore')
        .sort(([left], [right]) => String(left).localeCompare(String(right)))

    return entries.map(([key, value]) => `${key}:${String(value)}`).join('|') || 'all'
}

function parseQueryKey(queryKey = '') {
    return String(queryKey)
        .split('|')
        .filter(Boolean)
        .reduce((accumulator, segment) => {
            const separator = segment.indexOf(':')
            if (separator <= 0) return accumulator
            const key = segment.slice(0, separator)
            const value = segment.slice(separator + 1)
            accumulator[key] = value
            return accumulator
        }, {})
}

export const fetchAppointments = createAsyncThunk(
    'appointments/fetchAppointments',
    async ({ params = {}, force = false, isLoadMore = false } = {}) => {
        const responseData = await getAppointments(params)
        return {
            params,
            queryKey: serializeParams(params),
            items: responseData?.content ? responseData.content : (Array.isArray(responseData) ? responseData : []),
            totalPages: responseData?.totalPages || 0,
            hasMore: typeof responseData?.last === 'boolean' ? !responseData.last : false,
            page: params.page || 0,
            isLoadMore,
            force,
            fetchedAt: Date.now(),
        }
    },
    {
        condition: ({ params = {}, force = false } = {}, { getState }) => {
            if (force) return true
            const state = getState()
            const queryKey = serializeParams(params)
            const existing = state.appointments?.queries?.[queryKey]
            return !(existing && existing.status === 'succeeded' && Array.isArray(existing.items) && existing.items.length > 0)
        },
    }
)

export const createPatientAppointment = createAsyncThunk(
    'appointments/createPatientAppointment',
    async (payload) => {
        const created = await createAppointment(payload)
        return created
    }
)

export const updateAppointmentStatusById = createAsyncThunk(
    'appointments/updateAppointmentStatusById',
    async ({ appointmentId, status }) => {
        const updated = await updateAppointmentStatus(appointmentId, status)
        return {
            appointmentId,
            status,
            updated,
        }
    }
)

export const cancelAppointmentById = createAsyncThunk(
    'appointments/cancelAppointmentById',
    async (appointmentId) => {
        await cancelAppointment(appointmentId)
        return {
            appointmentId,
            status: 'CANCELLED',
        }
    }
)

export const fetchAppointmentById = createAsyncThunk(
    'appointments/fetchAppointmentById',
    async (id) => {
        const data = await getAppointmentById(id)
        return data
    }
)

const initialState = {
    queries: {},
    createState: {
        status: 'idle',
        error: null,
    },
    updateStateById: {},
}

const appointmentsSlice = createSlice({
    name: 'appointments',
    initialState,
    reducers: {
        resetCreateAppointmentState(state) {
            state.createState = { status: 'idle', error: null }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAppointments.pending, (state, action) => {
                const queryKey = serializeParams(action.meta.arg?.params)
                const existing = state.queries[queryKey] || EMPTY_QUERY
                state.queries[queryKey] = {
                    ...existing,
                    status: 'loading',
                    error: null,
                }
            })
            .addCase(fetchAppointments.fulfilled, (state, action) => {
                const { queryKey, items, fetchedAt, isLoadMore, hasMore, totalPages, page } = action.payload
                const existing = state.queries[queryKey] || EMPTY_QUERY
                state.queries[queryKey] = {
                    items: isLoadMore && existing.items ? [...existing.items, ...items] : items,
                    status: 'succeeded',
                    error: null,
                    lastFetched: fetchedAt,
                    hasMore,
                    totalPages,
                    page,
                }
            })
            .addCase(fetchAppointments.rejected, (state, action) => {
                const queryKey = serializeParams(action.meta.arg?.params)
                const existing = state.queries[queryKey] || EMPTY_QUERY
                state.queries[queryKey] = {
                    ...existing,
                    status: 'failed',
                    error: action.error?.message || 'Failed to load appointments.',
                }
            })
            .addCase(createPatientAppointment.pending, (state) => {
                state.createState.status = 'loading'
                state.createState.error = null
            })
            .addCase(createPatientAppointment.fulfilled, (state, action) => {
                state.createState.status = 'succeeded'
                state.createState.error = null

                const created = action.payload || {}
                const patientId = created?.patientId
                const doctorId = created?.doctorId

                for (const [queryKey, queryState] of Object.entries(state.queries)) {
                    if (!Array.isArray(queryState?.items)) continue
                    const parsed = parseQueryKey(queryKey)
                    const isPatientQuery = parsed.patientId && patientId && parsed.patientId === String(patientId)
                    const isDoctorQuery = parsed.doctorId && doctorId && parsed.doctorId === String(doctorId)

                    if (isPatientQuery || isDoctorQuery) {
                        const exists = queryState.items.some((item) => item?.id && item.id === created?.id)
                        if (!exists) {
                            queryState.items = [created, ...queryState.items]
                        }
                    }
                }
            })
            .addCase(createPatientAppointment.rejected, (state, action) => {
                state.createState.status = 'failed'
                state.createState.error = action.error?.message || 'Failed to create appointment.'
            })
            .addCase(updateAppointmentStatusById.pending, (state, action) => {
                const appointmentId = action.meta.arg?.appointmentId
                if (!appointmentId) return
                state.updateStateById[appointmentId] = {
                    status: 'loading',
                    error: null,
                }
            })
            .addCase(updateAppointmentStatusById.fulfilled, (state, action) => {
                const appointmentId = action.payload?.appointmentId
                const status = action.payload?.status
                const updated = action.payload?.updated || {}

                if (appointmentId) {
                    state.updateStateById[appointmentId] = {
                        status: 'succeeded',
                        error: null,
                    }
                }

                for (const queryState of Object.values(state.queries)) {
                    if (!Array.isArray(queryState?.items)) continue
                    queryState.items = queryState.items.map((item) => {
                        if (item?.id !== appointmentId) return item
                        return {
                            ...item,
                            ...updated,
                            status: updated?.status || status || item.status,
                        }
                    })
                }
            })
            .addCase(updateAppointmentStatusById.rejected, (state, action) => {
                const appointmentId = action.meta.arg?.appointmentId
                if (!appointmentId) return
                state.updateStateById[appointmentId] = {
                    status: 'failed',
                    error: action.error?.message || 'Failed to update appointment status.',
                }
            })
            .addCase(cancelAppointmentById.fulfilled, (state, action) => {
                const appointmentId = action.payload?.appointmentId
                const status = action.payload?.status

                for (const queryState of Object.values(state.queries)) {
                    if (!Array.isArray(queryState?.items)) continue
                    queryState.items = queryState.items.map((item) => {
                        if (item?.id !== appointmentId) return item
                        return {
                            ...item,
                            status: status,
                        }
                    })
                }
            })
            .addCase(fetchAppointmentById.fulfilled, (state, action) => {
                const item = action.payload
                if (!item?.id) return
                // Upsert into every existing query that matches this patient/doctor
                for (const queryState of Object.values(state.queries)) {
                    if (!Array.isArray(queryState?.items)) continue
                    const idx = queryState.items.findIndex((a) => a?.id === item.id)
                    if (idx >= 0) {
                        queryState.items[idx] = item
                    }
                }
                // Store in a dedicated single-item lookup
                state.byId = state.byId || {}
                state.byId[item.id] = item
            })
    },
})

export const { resetCreateAppointmentState } = appointmentsSlice.actions

export const selectAppointmentsQuery = (state, params = {}) => {
    const queryKey = serializeParams(params)
    return state.appointments?.queries?.[queryKey] || EMPTY_QUERY
}

// Scans ALL cached query buckets then falls back to byId lookup
export const selectAppointmentById = (state, id) => {
    if (!id) return null
    for (const queryState of Object.values(state.appointments?.queries || {})) {
        const found = queryState?.items?.find((a) => a?.id === id)
        if (found) return found
    }
    return state.appointments?.byId?.[id] || null
}

export const selectAppointmentsByParams = (state, params = {}) =>
    selectAppointmentsQuery(state, params).items

export const selectAppointmentsStatusByParams = (state, params = {}) =>
    selectAppointmentsQuery(state, params).status

export const selectAppointmentsErrorByParams = (state, params = {}) =>
    selectAppointmentsQuery(state, params).error

export const selectCreateAppointmentState = (state) =>
    state.appointments?.createState || { status: 'idle', error: null }

export default appointmentsSlice.reducer

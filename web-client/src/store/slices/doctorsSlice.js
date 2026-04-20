import { createAsyncThunk, createSlice, createSelector } from '@reduxjs/toolkit'
import {
    getDoctorAvailability,
    getDoctorByUserId,
    listDoctorSpecialties,
    listDoctors,
} from '@/features/doctors/services/doctorApi'

const EMPTY_RESOURCE = { items: [], status: 'idle', error: null, lastFetched: 0 }

export const fetchDoctorById = createAsyncThunk(
    'doctors/fetchDoctorById',
    async (id) => {
        const data = await getDoctorByUserId(id)
        return data
    }
)

export const fetchDoctors = createAsyncThunk(
    'doctors/fetchDoctors',
    async ({ params = {}, force = false } = {}) => {
        const data = await listDoctors(params)
        const items = data.content ? data.content : (Array.isArray(data) ? data : [])
        const totalPages = data.totalPages !== undefined ? data.totalPages : (items.length > 0 ? 1 : 0)
        const page = data.number !== undefined ? data.number : 0
        
        return {
            items,
            totalPages,
            page,
            force,
            fetchedAt: Date.now(),
        }
    }
)

export const fetchDoctorSpecialties = createAsyncThunk(
    'doctors/fetchDoctorSpecialties',
    async ({ force = false } = {}) => {
        const data = await listDoctorSpecialties()
        return {
            items: Array.isArray(data) ? data : [],
            force,
            fetchedAt: Date.now(),
        }
    },
    {
        condition: ({ force = false } = {}, { getState }) => {
            if (force) return true
            const state = getState()
            const specialties = state.doctors?.specialties
            return !(
                specialties &&
                specialties.status === 'succeeded' &&
                Array.isArray(specialties.items) &&
                specialties.items.length > 0
            )
        },
    }
)

export const fetchDoctorAvailability = createAsyncThunk(
    'doctors/fetchDoctorAvailability',
    async ({ doctorId, force = false } = {}) => {
        const data = await getDoctorAvailability(doctorId)
        return {
            doctorId,
            items: Array.isArray(data) ? data : [],
            force,
            fetchedAt: Date.now(),
        }
    },
    {
        condition: ({ doctorId, force = false } = {}, { getState }) => {
            if (!doctorId) return false
            if (force) return true
            const state = getState()
            const availability = state.doctors?.availabilityByDoctorId?.[doctorId]
            return !(availability && availability.status === 'succeeded')
        },
    }
)

const initialState = {
    doctors: { ...EMPTY_RESOURCE },
    specialties: { ...EMPTY_RESOURCE },
    availabilityByDoctorId: {},
    currentDoctor: { data: null, status: 'idle', error: null },
}

const doctorsSlice = createSlice({
    name: 'doctors',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchDoctors.pending, (state) => {
                state.doctors.status = 'loading'
                state.doctors.error = null
            })
            .addCase(fetchDoctors.fulfilled, (state, action) => {
                state.doctors = {
                    items: action.payload.items,
                    totalPages: action.payload.totalPages,
                    page: action.payload.page,
                    status: 'succeeded',
                    error: null,
                    lastFetched: action.payload.fetchedAt,
                }
            })
            .addCase(fetchDoctors.rejected, (state, action) => {
                state.doctors.status = 'failed'
                state.doctors.error = action.error?.message || 'Failed to load doctors.'
            })
            .addCase(fetchDoctorSpecialties.pending, (state) => {
                state.specialties.status = 'loading'
                state.specialties.error = null
            })
            .addCase(fetchDoctorSpecialties.fulfilled, (state, action) => {
                state.specialties = {
                    items: action.payload.items,
                    status: 'succeeded',
                    error: null,
                    lastFetched: action.payload.fetchedAt,
                }
            })
            .addCase(fetchDoctorSpecialties.rejected, (state, action) => {
                state.specialties.status = 'failed'
                state.specialties.error = action.error?.message || 'Failed to load specialties.'
            })
            .addCase(fetchDoctorAvailability.pending, (state, action) => {
                const doctorId = action.meta.arg?.doctorId
                if (!doctorId) return
                const existing = state.availabilityByDoctorId[doctorId] || EMPTY_RESOURCE
                state.availabilityByDoctorId[doctorId] = {
                    ...existing,
                    status: 'loading',
                    error: null,
                }
            })
            .addCase(fetchDoctorAvailability.fulfilled, (state, action) => {
                const doctorId = action.payload.doctorId
                if (!doctorId) return
                state.availabilityByDoctorId[doctorId] = {
                    items: action.payload.items,
                    status: 'succeeded',
                    error: null,
                    lastFetched: action.payload.fetchedAt,
                }
            })
            .addCase(fetchDoctorAvailability.rejected, (state, action) => {
                const doctorId = action.meta.arg?.doctorId
                if (!doctorId) return
                const existing = state.availabilityByDoctorId[doctorId] || EMPTY_RESOURCE
                state.availabilityByDoctorId[doctorId] = {
                    ...existing,
                    status: 'failed',
                    error: action.error?.message || 'Failed to load availability.',
                }
            })
            .addCase(fetchDoctorById.pending, (state) => {
                state.currentDoctor.status = 'loading'
                state.currentDoctor.error = null
            })
            .addCase(fetchDoctorById.fulfilled, (state, action) => {
                state.currentDoctor = {
                    data: action.payload,
                    status: 'succeeded',
                    error: null,
                }
            })
            .addCase(fetchDoctorById.rejected, (state, action) => {
                state.currentDoctor.status = 'failed'
                state.currentDoctor.error = action.error?.message || 'Failed to load doctor.'
            })
    },
})

export const selectDoctorsResource = (state) => state.doctors?.doctors || EMPTY_RESOURCE
export const selectDoctors = (state) => selectDoctorsResource(state).items
export const selectDoctorsStatus = (state) => selectDoctorsResource(state).status
export const selectDoctorsPagination = createSelector(
    selectDoctorsResource,
    (resource) => ({
        totalPages: resource.totalPages || 0,
        page: resource.page || 0,
    })
)

export const selectSpecialtiesResource = (state) => state.doctors?.specialties || EMPTY_RESOURCE
export const selectDoctorSpecialties = (state) => selectSpecialtiesResource(state).items
export const selectDoctorSpecialtiesStatus = (state) => selectSpecialtiesResource(state).status

export const selectDoctorAvailabilityResource = (state, doctorId) =>
    state.doctors?.availabilityByDoctorId?.[doctorId] || EMPTY_RESOURCE

export const selectDoctorAvailability = (state, doctorId) =>
    selectDoctorAvailabilityResource(state, doctorId).items

export const selectDoctorAvailabilityStatus = (state, doctorId) =>
    selectDoctorAvailabilityResource(state, doctorId).status

export const selectCurrentDoctor = (state) => state.doctors?.currentDoctor?.data
export const selectCurrentDoctorStatus = (state) => state.doctors?.currentDoctor?.status

export default doctorsSlice.reducer

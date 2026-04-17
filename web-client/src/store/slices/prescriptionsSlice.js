import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/services/api'

export const fetchPrescriptionsByAppointment = createAsyncThunk(
    'prescriptions/fetchByAppointment',
    async (appointmentId, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/doctors/appointments/${appointmentId}/prescriptions`)
            return { appointmentId, prescriptions: data }
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch prescriptions')
        }
    }
)

export const createPrescription = createAsyncThunk(
    'prescriptions/create',
    async ({ doctorId, payload }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`/doctors/${doctorId}/prescriptions`, payload)
            return data
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create prescription')
        }
    }
)

const initialState = {
    byAppointment: {}, // { appointmentId: { items: [], status: 'idle', error: null } }
}

const prescriptionsSlice = createSlice({
    name: 'prescriptions',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchPrescriptionsByAppointment.pending, (state, action) => {
                const appointmentId = action.meta.arg
                if (!state.byAppointment[appointmentId]) {
                    state.byAppointment[appointmentId] = { items: [], status: 'loading', error: null }
                } else {
                    state.byAppointment[appointmentId].status = 'loading'
                }
            })
            .addCase(fetchPrescriptionsByAppointment.fulfilled, (state, action) => {
                const { appointmentId, prescriptions } = action.payload
                state.byAppointment[appointmentId] = { items: prescriptions, status: 'succeeded', error: null }
            })
            .addCase(fetchPrescriptionsByAppointment.rejected, (state, action) => {
                const appointmentId = action.meta.arg
                state.byAppointment[appointmentId] = { items: [], status: 'failed', error: action.payload }
            })
            .addCase(createPrescription.fulfilled, (state, action) => {
                const prescription = action.payload
                const appointmentId = prescription.appointmentId
                if (state.byAppointment[appointmentId]) {
                    state.byAppointment[appointmentId].items.push(prescription)
                } else {
                    state.byAppointment[appointmentId] = { items: [prescription], status: 'succeeded', error: null }
                }
            })
    }
})

export const selectPrescriptionsByAppointment = (state, appointmentId) => 
    state.prescriptions.byAppointment[appointmentId] || { items: [], status: 'idle', error: null }

export default prescriptionsSlice.reducer

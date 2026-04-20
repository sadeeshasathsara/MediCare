import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/services/api'

export const fetchPatientReportsUrl = (patientId) => `/patients/${patientId}/reports`

export const fetchPatientReports = createAsyncThunk(
    'patientReports/fetch',
    async (patientId, { rejectWithValue }) => {
        try {
            const { data } = await api.get(fetchPatientReportsUrl(patientId))
            return { patientId, reports: data }
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch patient reports')
        }
    }
)

export const uploadPatientReport = createAsyncThunk(
    'patientReports/upload',
    async ({ patientId, file }, { rejectWithValue }) => {
        try {
            const formData = new FormData()
            formData.append('file', file)
            
            const { data } = await api.post(`/patients/${patientId}/reports`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            return { patientId, report: data }
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to upload patient report')
        }
    }
)

const initialState = {
    byPatient: {}, // { patientId: { items: [], status: 'idle', error: null } }
}

const patientReportsSlice = createSlice({
    name: 'patientReports',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchPatientReports.pending, (state, action) => {
                const patientId = action.meta.arg
                if (!state.byPatient[patientId]) {
                    state.byPatient[patientId] = { items: [], status: 'loading', error: null }
                } else {
                    state.byPatient[patientId].status = 'loading'
                }
            })
            .addCase(fetchPatientReports.fulfilled, (state, action) => {
                const { patientId, reports } = action.payload
                state.byPatient[patientId] = { items: reports, status: 'succeeded', error: null }
            })
            .addCase(fetchPatientReports.rejected, (state, action) => {
                const patientId = action.meta.arg
                state.byPatient[patientId] = { items: [], status: 'failed', error: action.payload }
            })
            .addCase(uploadPatientReport.fulfilled, (state, action) => {
                const { patientId, report } = action.payload
                if (state.byPatient[patientId]) {
                    state.byPatient[patientId].items.unshift(report)
                } else {
                    state.byPatient[patientId] = { items: [report], status: 'succeeded', error: null }
                }
            })
    }
})

export const selectPatientReports = (state, patientId) => 
    state.patientReports.byPatient[patientId] || { items: [], status: 'idle', error: null }

export default patientReportsSlice.reducer

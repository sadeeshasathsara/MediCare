import { configureStore } from '@reduxjs/toolkit'
import appointmentsReducer from '@/store/slices/appointmentsSlice'
import doctorsReducer from '@/store/slices/doctorsSlice'
import prescriptionsReducer from '@/store/slices/prescriptionsSlice'
import patientReportsReducer from '@/store/slices/patientReportsSlice'
import aiSymptomReducer from '@/store/slices/aiSymptomSlice'

export const store = configureStore({
    reducer: {
        appointments: appointmentsReducer,
        doctors: doctorsReducer,
        prescriptions: prescriptionsReducer,
        patientReports: patientReportsReducer,
        aiSymptom: aiSymptomReducer,
    },
})

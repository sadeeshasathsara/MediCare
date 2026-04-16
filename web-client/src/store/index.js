import { configureStore } from '@reduxjs/toolkit'
import appointmentsReducer from '@/store/slices/appointmentsSlice'
import doctorsReducer from '@/store/slices/doctorsSlice'

export const store = configureStore({
    reducer: {
        appointments: appointmentsReducer,
        doctors: doctorsReducer,
    },
})

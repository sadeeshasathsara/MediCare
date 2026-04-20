import { createSlice } from '@reduxjs/toolkit'

const aiSymptomSlice = createSlice({
    name: 'aiSymptom',
    initialState: {
        lastResult: null,
    },
    reducers: {
        setLastResult(state, action) {
            state.lastResult = action.payload
        },
        clearResult(state) {
            state.lastResult = null
        },
    },
})

export const { setLastResult, clearResult } = aiSymptomSlice.actions
export default aiSymptomSlice.reducer

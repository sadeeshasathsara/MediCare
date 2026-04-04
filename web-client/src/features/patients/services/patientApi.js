import api from '@/services/api'

export async function getPatientProfile(userId) {
    const { data } = await api.get(`/patients/${encodeURIComponent(userId)}`)
    return data
}

export async function updatePatientProfile(userId, payload) {
    const { data } = await api.put(`/patients/${encodeURIComponent(userId)}`, payload)
    return data
}

export async function uploadPatientReport(userId, file) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post(`/patients/${encodeURIComponent(userId)}/reports`, form, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    })
    return data
}

export async function listPatientReports(userId) {
    const { data } = await api.get(`/patients/${encodeURIComponent(userId)}/reports`)
    return data
}

export async function downloadPatientReport(userId, reportId) {
    const res = await api.get(`/patients/${encodeURIComponent(userId)}/reports/${encodeURIComponent(reportId)}`, {
        responseType: 'blob',
    })
    return res
}

export async function getPatientHistory(userId) {
    const { data } = await api.get(`/patients/${encodeURIComponent(userId)}/history`)
    return data
}

export async function getPatientPrescriptions(userId) {
    const { data } = await api.get(`/patients/${encodeURIComponent(userId)}/prescriptions`)
    return data
}

export async function adminListPatients(page = 0, size = 10) {
    const { data } = await api.get('/patients/admin/patients', { params: { page, size } })
    return data
}

export async function adminSetPatientStatus(userId, status) {
    const { data } = await api.patch(`/patients/admin/patients/${encodeURIComponent(userId)}/status`, { status })
    return data
}

export async function adminDeletePatient(userId) {
    const { data } = await api.delete(`/patients/${encodeURIComponent(userId)}`)
    return data
}

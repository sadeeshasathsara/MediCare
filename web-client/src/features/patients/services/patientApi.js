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

export async function uploadPatientReportToFolder(userId, file, folderId) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post(`/patients/${encodeURIComponent(userId)}/reports`, form, {
        params: {
            folderId: folderId || undefined,
        },
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

export async function listPatientReportFolders(userId) {
    const { data } = await api.get(`/patients/${encodeURIComponent(userId)}/report-folders`)
    return data
}

export async function createPatientReportFolder(userId, payload) {
    const { data } = await api.post(`/patients/${encodeURIComponent(userId)}/report-folders`, payload)
    return data
}

export async function updatePatientReportFolder(userId, folderId, payload) {
    const { data } = await api.patch(
        `/patients/${encodeURIComponent(userId)}/report-folders/${encodeURIComponent(folderId)}`,
        payload,
    )
    return data
}

export async function deletePatientReportFolder(userId, folderId) {
    const { data } = await api.delete(`/patients/${encodeURIComponent(userId)}/report-folders/${encodeURIComponent(folderId)}`)
    return data
}

export async function updatePatientReport(userId, reportId, payload) {
    const { data } = await api.patch(
        `/patients/${encodeURIComponent(userId)}/reports/${encodeURIComponent(reportId)}`,
        payload,
    )
    return data
}

export async function deletePatientReport(userId, reportId) {
    const { data } = await api.delete(`/patients/${encodeURIComponent(userId)}/reports/${encodeURIComponent(reportId)}`)
    return data
}

export async function copyPatientReport(userId, reportId, payload) {
    const { data } = await api.post(
        `/patients/${encodeURIComponent(userId)}/reports/${encodeURIComponent(reportId)}/copy`,
        payload || {},
    )
    return data
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

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
    downloadPatientReport,
    listPatientReports,
    uploadPatientReport,
} from '@/features/patients/services/patientApi'
import { Download, Upload, RefreshCcw, Folder, MoreVertical, Plus } from 'lucide-react'

const STORAGE_PREFIX = 'patientReportFolders:v1:'
const ALL_FOLDER_ID = '__all__'
const UNCATEGORIZED_FOLDER_ID = '__uncategorized__'

function storageKey(userId) {
    return `${STORAGE_PREFIX}${userId}`
}

function safeJsonParse(value, fallback) {
    try {
        return JSON.parse(value)
    } catch {
        return fallback
    }
}

function newId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function loadFolderState(userId) {
    const raw = window.localStorage.getItem(storageKey(userId))
    const parsed = safeJsonParse(raw, null)
    const folders = Array.isArray(parsed?.folders) ? parsed.folders : []
    const assignments = parsed?.assignments && typeof parsed.assignments === 'object' ? parsed.assignments : {}
    const hiddenReportIds = Array.isArray(parsed?.hiddenReportIds) ? parsed.hiddenReportIds : []
    const shortcuts = Array.isArray(parsed?.shortcuts) ? parsed.shortcuts : []
    const nameOverrides = parsed?.nameOverrides && typeof parsed.nameOverrides === 'object' ? parsed.nameOverrides : {}
    return {
        folders: folders
            .filter((f) => f && typeof f.id === 'string' && typeof f.name === 'string')
            .map((f) => ({
                id: f.id,
                name: f.name,
                parentId: typeof f.parentId === 'string' ? f.parentId : ALL_FOLDER_ID,
            })),
        assignments,
        hiddenReportIds: hiddenReportIds.filter((id) => typeof id === 'string'),
        shortcuts: shortcuts
            .filter((s) => s && typeof s.id === 'string' && typeof s.reportId === 'string' && typeof s.folderId === 'string')
            .map((s) => ({ id: s.id, reportId: s.reportId, folderId: s.folderId })),
        nameOverrides,
    }
}

function saveFolderState(userId, state) {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state))
}

function folderLabel(folderId, folders) {
    if (folderId === ALL_FOLDER_ID) return 'All'
    if (folderId === UNCATEGORIZED_FOLDER_ID) return 'Uncategorized'
    const found = folders.find((f) => f.id === folderId)
    return found?.name || 'Uncategorized'
}

function isRealFolderId(folderId) {
    return Boolean(folderId) && folderId !== ALL_FOLDER_ID && folderId !== UNCATEGORIZED_FOLDER_ID
}

function isTypingTarget(el) {
    if (!el) return false
    const tag = el.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
    return Boolean(el.isContentEditable)
}

export default function PatientReportsPage() {
    const { user } = useAuth()
    const userId = user?.id

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [reports, setReports] = useState([])

    const [folders, setFolders] = useState([])
    const [assignments, setAssignments] = useState({})
    const [hiddenReportIds, setHiddenReportIds] = useState([])
    const [shortcuts, setShortcuts] = useState([])
    const [nameOverrides, setNameOverrides] = useState({})
    const [currentFolderId, setCurrentFolderId] = useState(ALL_FOLDER_ID)
    const [selectedFolderIds, setSelectedFolderIds] = useState([])
    const [selectedFileIds, setSelectedFileIds] = useState([])

    const [clipboard, setClipboard] = useState(null) // { mode: 'copy'|'cut', folderIds: [], fileIds: [] }

    const [createOpen, setCreateOpen] = useState(false)
    const [createValue, setCreateValue] = useState('')

    const [renameOpen, setRenameOpen] = useState(false)
    const [renameValue, setRenameValue] = useState('')
    const [renameTargetId, setRenameTargetId] = useState(null)
    const [renameTargetKind, setRenameTargetKind] = useState(null) // 'folder'|'file'
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteTargetIds, setDeleteTargetIds] = useState([])

    const [folderMenuOpenId, setFolderMenuOpenId] = useState(null)
    const [fileMenuOpenId, setFileMenuOpenId] = useState(null)

    const [contextMenu, setContextMenu] = useState(null)
    // contextMenu: { x, y, kind: 'background'|'folder'|'file', targetId, folderIdForPaste }

    const longPressTimerRef = useRef(null)

    const [reviewOpen, setReviewOpen] = useState(false)
    const [pendingFiles, setPendingFiles] = useState([])
    const [activePendingIndex, setActivePendingIndex] = useState(0)
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState('')
    const [uploading, setUploading] = useState(false)
    const [pendingFolderId, setPendingFolderId] = useState(UNCATEGORIZED_FOLDER_ID)

    const canUse = useMemo(() => Boolean(userId), [userId])

    const isMobileLike = useMemo(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return false
        return window.matchMedia('(pointer: coarse)').matches
    }, [])

    useEffect(() => {
        if (!userId) return
        const state = loadFolderState(userId)
        setFolders(state.folders)
        setAssignments(state.assignments)
        setHiddenReportIds(state.hiddenReportIds)
        setShortcuts(state.shortcuts)
        setNameOverrides(state.nameOverrides)
        setCurrentFolderId(ALL_FOLDER_ID)
        setSelectedFolderIds([])
        setSelectedFileIds([])
        setClipboard(null)
    }, [userId])

    useEffect(() => {
        if (!folderMenuOpenId && !fileMenuOpenId && !contextMenu) return

        const onPointerDown = (e) => {
            const target = e.target
            if (target?.closest?.('[data-folder-menu="true"]')) return
            if (target?.closest?.('[data-file-menu="true"]')) return
            if (target?.closest?.('[data-context-menu="true"]')) return
            setFolderMenuOpenId(null)
            setFileMenuOpenId(null)
            setContextMenu(null)
        }

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                setFolderMenuOpenId(null)
                setFileMenuOpenId(null)
                setContextMenu(null)
            }
        }

        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [folderMenuOpenId, fileMenuOpenId, contextMenu])

    const persist = (nextFolders, nextAssignments, nextHiddenReportIds, nextShortcuts, nextNameOverrides) => {
        if (!userId) return
        saveFolderState(userId, {
            folders: nextFolders,
            assignments: nextAssignments,
            hiddenReportIds: nextHiddenReportIds,
            shortcuts: nextShortcuts,
            nameOverrides: nextNameOverrides,
        })
    }

    const folderById = useMemo(() => {
        const map = new Map()
        for (const f of folders) map.set(f.id, f)
        return map
    }, [folders])

    const folderPathIds = useMemo(() => {
        if (!isRealFolderId(currentFolderId)) return []
        const path = []
        const seen = new Set()
        let cursor = currentFolderId
        while (cursor && cursor !== ALL_FOLDER_ID && !seen.has(cursor)) {
            seen.add(cursor)
            path.push(cursor)
            const node = folderById.get(cursor)
            cursor = node?.parentId
        }
        path.reverse()
        return path
    }, [currentFolderId, folderById])

    const folderPathLabel = (folderId) => {
        if (!isRealFolderId(folderId)) return folderLabel(folderId, folders)
        const parts = []
        const seen = new Set()
        let cursor = folderId
        while (cursor && cursor !== ALL_FOLDER_ID && !seen.has(cursor)) {
            seen.add(cursor)
            const node = folderById.get(cursor)
            parts.push(node?.name || 'Folder')
            cursor = node?.parentId
        }
        return parts.reverse().join(' / ')
    }

    const ensureAssignmentsValid = (reportList) => {
        const reportIds = new Set((reportList || []).map((r) => r?.id).filter(Boolean))
        const validFolderIds = new Set(folders.map((f) => f.id))
        const next = {}
        for (const [reportId, folderId] of Object.entries(assignments)) {
            if (!reportIds.has(reportId)) continue
            if (folderId === UNCATEGORIZED_FOLDER_ID) continue
            if (validFolderIds.has(folderId)) next[reportId] = folderId
        }
        if (JSON.stringify(next) !== JSON.stringify(assignments)) {
            setAssignments(next)
            persist(folders, next, hiddenReportIds, shortcuts, nameOverrides)
        }
    }

    const load = async () => {
        if (!userId) return
        setLoading(true)
        setError('')
        try {
            const data = await listPatientReports(userId)
            const list = Array.isArray(data) ? data : []
            setReports(list)
            return list
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to load reports')
            return []
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    useEffect(() => {
        if (!userId) return
        ensureAssignmentsValid(reports)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reports, folders.length])

    const hiddenSet = useMemo(() => new Set(hiddenReportIds), [hiddenReportIds])

    useEffect(() => {
        if (!reviewOpen) return

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                setReviewOpen(false)
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [reviewOpen])

    useEffect(() => {
        const active = pendingFiles?.[activePendingIndex]
        if (!active) {
            if (pendingPreviewUrl) window.URL.revokeObjectURL(pendingPreviewUrl)
            setPendingPreviewUrl('')
            return
        }

        if (pendingPreviewUrl) window.URL.revokeObjectURL(pendingPreviewUrl)

        const isPreviewable = active.type?.startsWith('image/') || active.type === 'application/pdf'
        if (!isPreviewable) {
            setPendingPreviewUrl('')
            return
        }

        const url = window.URL.createObjectURL(active)
        setPendingPreviewUrl(url)

        return () => {
            window.URL.revokeObjectURL(url)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingFiles, activePendingIndex])

    const mergeFiles = (current, incoming) => {
        const next = [...(current || [])]
        const seen = new Set(next.map((f) => `${f.name}|${f.size}|${f.lastModified}`))
        for (const f of incoming || []) {
            if (!f) continue
            const key = `${f.name}|${f.size}|${f.lastModified}`
            if (seen.has(key)) continue
            seen.add(key)
            next.push(f)
        }
        return next
    }

    const openReview = (files) => {
        const list = Array.from(files || []).filter(Boolean)
        if (list.length === 0) return
        setError('')
        setPendingFiles((prev) => {
            const merged = mergeFiles(prev, list)
            return merged
        })
        setActivePendingIndex(0)
        const defaultFolder = currentFolderId === ALL_FOLDER_ID ? UNCATEGORIZED_FOLDER_ID : currentFolderId
        setPendingFolderId(defaultFolder)
        setReviewOpen(true)
    }

    const closeReview = () => {
        setReviewOpen(false)
        setPendingFiles([])
        setActivePendingIndex(0)
        if (pendingPreviewUrl) window.URL.revokeObjectURL(pendingPreviewUrl)
        setPendingPreviewUrl('')
        setUploading(false)
        setPendingFolderId(UNCATEGORIZED_FOLDER_ID)
    }

    const confirmUpload = async () => {
        if (!userId || pendingFiles.length === 0) return
        setUploading(true)
        setError('')
        try {
            const createdIds = []
            for (const f of pendingFiles) {
                const created = await uploadPatientReport(userId, f)
                if (created?.id) createdIds.push(created.id)
            }

            const list = await load()

            const nextAssignments = { ...assignments }

            // Best-effort assignment: use returned ids when available; otherwise match by filename.
            for (const id of createdIds) {
                nextAssignments[id] = pendingFolderId
            }

            const missing = pendingFiles.filter((f) => !createdIds.length || !createdIds.includes(f?.id))
            for (const f of missing) {
                if (!f?.name) continue
                const matches = (list || []).filter((r) => r?.originalFileName === f.name)
                matches.sort((a, b) => new Date(b?.uploadedAt || 0).getTime() - new Date(a?.uploadedAt || 0).getTime())
                const matchId = matches?.[0]?.id
                if (matchId && !nextAssignments[matchId]) nextAssignments[matchId] = pendingFolderId
            }

            setAssignments(nextAssignments)
            persist(folders, nextAssignments, hiddenReportIds, shortcuts, nameOverrides)
            closeReview()
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to upload report')
            setUploading(false)
        }
    }

    const removePendingAt = (index) => {
        setPendingFiles((prev) => {
            const next = prev.filter((_, i) => i !== index)
            const nextActive = Math.max(0, Math.min(activePendingIndex, next.length - 1))
            setActivePendingIndex(nextActive)
            if (next.length === 0) setReviewOpen(false)
            return next
        })
    }

    const fileFolderId = (reportId) => {
        const assigned = assignments?.[reportId]
        if (!assigned) return UNCATEGORIZED_FOLDER_ID
        if (assigned === UNCATEGORIZED_FOLDER_ID) return UNCATEGORIZED_FOLDER_ID
        if (!folders.some((f) => f.id === assigned)) return UNCATEGORIZED_FOLDER_ID
        return assigned
    }

    const folderCounts = useMemo(() => {
        const counts = { [UNCATEGORIZED_FOLDER_ID]: 0 }
        for (const f of folders) counts[f.id] = 0
        for (const r of reports) {
            if (hiddenSet.has(r?.id)) continue
            const folderId = fileFolderId(r?.id)
            counts[folderId] = (counts[folderId] || 0) + 1
        }

        for (const s of shortcuts) {
            if (!s?.id || !s?.reportId || !s?.folderId) continue
            if (hiddenSet.has(s.reportId)) continue
            const folderId = s.folderId
            if (folderId === ALL_FOLDER_ID) continue
            counts[folderId] = (counts[folderId] || 0) + 1
        }
        return counts
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reports, assignments, folders, hiddenReportIds, shortcuts])

    const reportById = useMemo(() => {
        const map = new Map()
        for (const r of reports) {
            if (r?.id) map.set(r.id, r)
        }
        return map
    }, [reports])

    const visibleFileItems = useMemo(() => {
        const items = []
        const destination = currentFolderId === ALL_FOLDER_ID ? UNCATEGORIZED_FOLDER_ID : currentFolderId

        for (const r of reports) {
            if (!r?.id) continue
            if (hiddenSet.has(r.id)) continue
            const folderId = fileFolderId(r.id)
            if (destination === UNCATEGORIZED_FOLDER_ID) {
                if (folderId !== UNCATEGORIZED_FOLDER_ID) continue
            } else {
                if (folderId !== destination) continue
            }
            items.push({ kind: 'report', id: `report:${r.id}`, reportId: r.id, report: r })
        }

        for (const s of shortcuts) {
            if (!s?.id || !s?.reportId || !s?.folderId) continue
            if (hiddenSet.has(s.reportId)) continue
            const targetFolderId = s.folderId === ALL_FOLDER_ID ? UNCATEGORIZED_FOLDER_ID : s.folderId
            if (targetFolderId !== destination) continue
            const report = reportById.get(s.reportId)
            if (!report) continue
            items.push({ kind: 'shortcut', id: `shortcut:${s.id}`, shortcutId: s.id, reportId: s.reportId, report })
        }

        return items
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reports, currentFolderId, assignments, folders, hiddenReportIds, shortcuts, reportById])

    const currentFolderName = useMemo(() => {
        if (currentFolderId === ALL_FOLDER_ID) return 'Reports'
        return folderLabel(currentFolderId, folders)
    }, [currentFolderId, folders])

    const openFolder = (folderId) => {
        setCurrentFolderId(folderId)
        setSelectedFolderIds([])
        setSelectedFileIds([])
        setFolderMenuOpenId(null)
        setFileMenuOpenId(null)
        setContextMenu(null)
    }

    const createFolder = (name, parentId) => {
        const trimmed = (name || '').trim()
        if (!trimmed) return null
        const id = newId()
        const normalizedParent = isRealFolderId(parentId) ? parentId : ALL_FOLDER_ID
        const nextFolders = [...folders, { id, name: trimmed, parentId: normalizedParent }]
        setFolders(nextFolders)
        persist(nextFolders, assignments, hiddenReportIds, shortcuts, nameOverrides)
        return id
    }

    const isSystemFolder = (folderId) => folderId === UNCATEGORIZED_FOLDER_ID || folderId === ALL_FOLDER_ID

    const toggleFolderSelection = (folderId) => {
        setSelectedFolderIds((prev) => {
            const set = new Set(prev)
            if (set.has(folderId)) set.delete(folderId)
            else set.add(folderId)
            return Array.from(set)
        })
    }

    const clearSelection = () => setSelectedFolderIds([])

    const beginLongPress = (folderId) => {
        if (!isMobileLike) return
        if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = window.setTimeout(() => {
            toggleFolderSelection(folderId)
            longPressTimerRef.current = null
        }, 450)
    }

    const cancelLongPress = () => {
        if (!longPressTimerRef.current) return
        window.clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
    }

    const openRename = () => {
        const id = renameTargetId
        if (!id || isSystemFolder(id)) return
        setRenameValue(folderLabel(id, folders))
        setRenameOpen(true)
    }

    const confirmRename = () => {
        const id = renameTargetId
        const name = renameValue.trim()
        if (!id || !name) return

        if (renameTargetKind === 'folder') {
            if (isSystemFolder(id)) return
            const nextFolders = folders.map((f) => (f.id === id ? { ...f, name } : f))
            setFolders(nextFolders)
            persist(nextFolders, assignments, hiddenReportIds, shortcuts, nameOverrides)
        } else if (renameTargetKind === 'file') {
            const nextOverrides = { ...nameOverrides, [id]: name }
            setNameOverrides(nextOverrides)
            persist(folders, assignments, hiddenReportIds, shortcuts, nextOverrides)
        }

        setRenameOpen(false)
        setRenameTargetId(null)
        setRenameTargetKind(null)
        setFolderMenuOpenId(null)
        setFileMenuOpenId(null)
    }

    const openDelete = (ids) => {
        const list = (ids || []).filter(Boolean)
        if (list.length === 0) return
        setDeleteTargetIds(list)
        setDeleteOpen(true)
    }

    const collectDescendants = (rootIds) => {
        const roots = (rootIds || []).filter((id) => isRealFolderId(id))
        const result = new Set(roots)
        const queue = [...roots]
        while (queue.length) {
            const id = queue.shift()
            for (const f of folders) {
                if (f.parentId === id && !result.has(f.id)) {
                    result.add(f.id)
                    queue.push(f.id)
                }
            }
        }
        return Array.from(result)
    }

    const confirmDelete = () => {
        const idsToDelete = collectDescendants(deleteTargetIds).filter((id) => !isSystemFolder(id))
        if (idsToDelete.length === 0) {
            setDeleteOpen(false)
            return
        }

        const idSet = new Set(idsToDelete)
        const nextFolders = folders.filter((f) => !idSet.has(f.id))
        const nextAssignments = { ...assignments }
        const reportIdsToHide = []

        for (const r of reports) {
            const reportId = r?.id
            if (!reportId) continue
            const folderId = assignments?.[reportId]
            if (folderId && idSet.has(folderId)) {
                reportIdsToHide.push(reportId)
                delete nextAssignments[reportId]
            }
        }

        const nextHidden = Array.from(new Set([...hiddenReportIds, ...reportIdsToHide]))

        const nextShortcuts = shortcuts.filter((s) => !idSet.has(s.folderId))

        setFolders(nextFolders)
        setAssignments(nextAssignments)
        setHiddenReportIds(nextHidden)
        setShortcuts(nextShortcuts)
        persist(nextFolders, nextAssignments, nextHidden, nextShortcuts, nameOverrides)

        if (idSet.has(currentFolderId)) {
            setCurrentFolderId(ALL_FOLDER_ID)
        }

        setSelectedFolderIds([])
        setDeleteOpen(false)
        setDeleteTargetIds([])
        setFolderMenuOpenId(null)
    }

    const deleteSelectedFiles = () => {
        if (selectedFileIds.length === 0) return
        deleteFileIds(selectedFileIds)
    }

    const deleteFileIds = (fileIds) => {
        const ids = (fileIds || []).filter(Boolean)
        if (ids.length === 0) return
        const nextAssignments = { ...assignments }
        const nextShortcuts = [...shortcuts]
        const nextHidden = new Set(hiddenReportIds)
        const nextOverrides = { ...nameOverrides }

        for (const fid of ids) {
            if (fid.startsWith('shortcut:')) {
                const sid = fid.slice('shortcut:'.length)
                const idx = nextShortcuts.findIndex((s) => s.id === sid)
                if (idx >= 0) nextShortcuts.splice(idx, 1)
                delete nextOverrides[fid]
            } else if (fid.startsWith('report:')) {
                const rid = fid.slice('report:'.length)
                nextHidden.add(rid)
                delete nextAssignments[rid]
                delete nextOverrides[fid]
            }
        }

        const hiddenList = Array.from(nextHidden)
        setAssignments(nextAssignments)
        setHiddenReportIds(hiddenList)
        setShortcuts(nextShortcuts)
        setNameOverrides(nextOverrides)
        persist(folders, nextAssignments, hiddenList, nextShortcuts, nextOverrides)
        setSelectedFileIds((prev) => prev.filter((id) => !ids.includes(id)))
        setFileMenuOpenId(null)
    }

    const fileDisplayName = (fileItem) => {
        const key = fileItem?.id
        const override = key ? nameOverrides?.[key] : ''
        return override || fileItem?.report?.originalFileName || 'Report'
    }

    const destinationFolderForFiles = () => (isRealFolderId(currentFolderId) ? currentFolderId : UNCATEGORIZED_FOLDER_ID)

    const destinationParentForFolders = () => (isRealFolderId(currentFolderId) ? currentFolderId : ALL_FOLDER_ID)

    const openFileRename = (fileId, currentName) => {
        setRenameTargetKind('file')
        setRenameTargetId(fileId)
        setRenameValue(currentName || '')
        setRenameOpen(true)
        setFileMenuOpenId(null)
    }

    const openFolderRename = (folderId, currentName) => {
        setRenameTargetKind('folder')
        setRenameTargetId(folderId)
        setRenameValue(currentName || '')
        setRenameOpen(true)
        setFolderMenuOpenId(null)
    }

    const openFileMenu = (fileId) => {
        setFileMenuOpenId((prev) => (prev === fileId ? null : fileId))
    }

    const copyOrCut = (mode) => {
        const folderIds = selectedFolderIds.filter(Boolean)
        const fileIds = selectedFileIds.filter(Boolean)
        if (folderIds.length === 0 && fileIds.length === 0) return
        setClipboard({ mode, folderIds, fileIds })
    }

    const canPaste = Boolean(clipboard?.folderIds?.length || clipboard?.fileIds?.length)

    const resolvePasteDestination = (targetFolderId) => {
        // If targetFolderId is a real folder, paste into it.
        if (isRealFolderId(targetFolderId)) {
            return { destParent: targetFolderId, destFileFolder: targetFolderId }
        }

        // If pasting into Uncategorized or root, files go to Uncategorized, folders go to root.
        return { destParent: ALL_FOLDER_ID, destFileFolder: UNCATEGORIZED_FOLDER_ID }
    }

    const pasteWithDestination = (destParent, destFileFolder) => {
        if (!clipboard) return
        const mode = clipboard.mode

        // Folders
        if (clipboard.folderIds?.length) {
            const roots = clipboard.folderIds.filter((id) => isRealFolderId(id))

            if (mode === 'cut') {
                // Prevent moving a folder into itself/its descendants.
                const forbidden = new Set(collectDescendants(roots))
                if (forbidden.has(destParent)) {
                    setError('Cannot move a folder into itself.')
                } else {
                    const nextFolders = folders.map((f) => (roots.includes(f.id) ? { ...f, parentId: destParent } : f))
                    setFolders(nextFolders)
                    persist(nextFolders, assignments, hiddenReportIds, shortcuts, nameOverrides)
                }
            } else if (mode === 'copy') {
                const toCopy = collectDescendants(roots)
                const mapOldToNew = new Map()
                for (const id of toCopy) mapOldToNew.set(id, newId())

                const nextFolders = [...folders]
                for (const oldId of toCopy) {
                    const old = folders.find((f) => f.id === oldId)
                    if (!old) continue
                    const newIdVal = mapOldToNew.get(oldId)
                    const oldParent = old.parentId
                    const newParent = roots.includes(oldId) ? destParent : mapOldToNew.get(oldParent) || destParent
                    nextFolders.push({ id: newIdVal, name: old.name, parentId: newParent })
                }

                const nextShortcuts = [...shortcuts]
                // Copy contents: create shortcuts for reports assigned in copied folders.
                for (const r of reports) {
                    const rid = r?.id
                    if (!rid || hiddenSet.has(rid)) continue
                    const folderId = assignments?.[rid] || UNCATEGORIZED_FOLDER_ID
                    if (!toCopy.includes(folderId)) continue
                    const newFolderId = mapOldToNew.get(folderId)
                    if (!newFolderId) continue
                    nextShortcuts.push({ id: newId(), reportId: rid, folderId: newFolderId })
                }

                for (const s of shortcuts) {
                    if (!s?.id || !s?.reportId || !s?.folderId) continue
                    if (!toCopy.includes(s.folderId)) continue
                    const newFolderId = mapOldToNew.get(s.folderId)
                    if (!newFolderId) continue
                    nextShortcuts.push({ id: newId(), reportId: s.reportId, folderId: newFolderId })
                }

                setFolders(nextFolders)
                setShortcuts(nextShortcuts)
                persist(nextFolders, assignments, hiddenReportIds, nextShortcuts, nameOverrides)
            }
        }

        // Files
        if (clipboard.fileIds?.length) {
            const nextAssignments = { ...assignments }
            const nextShortcuts = [...shortcuts]
            const dest = destFileFolder

            if (mode === 'cut') {
                for (const fid of clipboard.fileIds) {
                    if (fid.startsWith('shortcut:')) {
                        const sid = fid.slice('shortcut:'.length)
                        const s = nextShortcuts.find((x) => x.id === sid)
                        if (s) s.folderId = dest
                    } else if (fid.startsWith('report:')) {
                        const rid = fid.slice('report:'.length)
                        nextAssignments[rid] = dest
                    }
                }
                setAssignments(nextAssignments)
                setShortcuts(nextShortcuts)
                persist(folders, nextAssignments, hiddenReportIds, nextShortcuts, nameOverrides)
            } else if (mode === 'copy') {
                for (const fid of clipboard.fileIds) {
                    if (fid.startsWith('shortcut:')) {
                        const sid = fid.slice('shortcut:'.length)
                        const s = shortcuts.find((x) => x.id === sid)
                        if (s) nextShortcuts.push({ id: newId(), reportId: s.reportId, folderId: dest })
                    } else if (fid.startsWith('report:')) {
                        const rid = fid.slice('report:'.length)
                        nextShortcuts.push({ id: newId(), reportId: rid, folderId: dest })
                    }
                }
                setShortcuts(nextShortcuts)
                persist(folders, assignments, hiddenReportIds, nextShortcuts, nameOverrides)
            }
        }

        if (clipboard.mode === 'cut') setClipboard(null)
        setSelectedFolderIds([])
        setSelectedFileIds([])
        setFolderMenuOpenId(null)
        setFileMenuOpenId(null)
    }

    const paste = () => {
        const { destParent, destFileFolder } = resolvePasteDestination(currentFolderId)
        pasteWithDestination(destParent, destFileFolder)
    }

    const pasteInto = (targetFolderId) => {
        const { destParent, destFileFolder } = resolvePasteDestination(targetFolderId)
        pasteWithDestination(destParent, destFileFolder)
    }

    useEffect(() => {
        const onKeyDown = (e) => {
            if (isTypingTarget(e.target)) return
            if (reviewOpen || renameOpen || deleteOpen || createOpen) return

            const isAccel = e.ctrlKey || e.metaKey

            if (isAccel && (e.key === 'c' || e.key === 'C')) {
                e.preventDefault()
                copyOrCut('copy')
                return
            }
            if (isAccel && (e.key === 'x' || e.key === 'X')) {
                e.preventDefault()
                copyOrCut('cut')
                return
            }
            if (isAccel && (e.key === 'v' || e.key === 'V')) {
                if (!canPaste) return
                e.preventDefault()
                paste()
                return
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedFolderIds.length) {
                    e.preventDefault()
                    openDelete(selectedFolderIds)
                    return
                }
                if (selectedFileIds.length) {
                    e.preventDefault()
                    deleteSelectedFiles()
                    return
                }
            }

            if (e.key === 'F2') {
                const oneFolder = selectedFolderIds.length === 1 && selectedFileIds.length === 0
                const oneFile = selectedFileIds.length === 1 && selectedFolderIds.length === 0
                if (oneFolder) {
                    const id = selectedFolderIds[0]
                    if (!isSystemFolder(id)) {
                        e.preventDefault()
                        openFolderRename(id, folderLabel(id, folders))
                    }
                } else if (oneFile) {
                    e.preventDefault()
                    const fid = selectedFileIds[0]
                    const item = visibleFileItems.find((it) => it.id === fid)
                    openFileRename(fid, item ? fileDisplayName(item) : '')
                }
            }
        }

        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        selectedFolderIds,
        selectedFileIds,
        clipboard,
        folders,
        assignments,
        hiddenReportIds,
        shortcuts,
        nameOverrides,
        currentFolderId,
        reviewOpen,
        renameOpen,
        deleteOpen,
        createOpen,
        visibleFileItems,
    ])

    const currentFolderChildFolders = useMemo(() => {
        if (currentFolderId === ALL_FOLDER_ID) {
            return folders.filter((f) => (f.parentId || ALL_FOLDER_ID) === ALL_FOLDER_ID)
        }
        if (!isRealFolderId(currentFolderId)) return []
        return folders.filter((f) => f.parentId === currentFolderId)
    }, [folders, currentFolderId])

    const openCreateFolder = () => {
        setCreateValue('')
        setCreateOpen(true)
        setFolderMenuOpenId(null)
        setContextMenu(null)
    }

    const confirmCreateFolder = () => {
        const parentId = isRealFolderId(currentFolderId) ? currentFolderId : ALL_FOLDER_ID
        const id = createFolder(createValue, parentId)
        if (!id) return
        setCreateOpen(false)
        setCreateValue('')
    }

    const openFolderMenu = (folderId) => {
        setFolderMenuOpenId((prev) => (prev === folderId ? null : folderId))
    }

    const openContextMenu = (e, menu) => {
        e.preventDefault()
        e.stopPropagation()
        setFolderMenuOpenId(null)
        setFileMenuOpenId(null)
        const x = Math.min(e.clientX, window.innerWidth - 220)
        const y = Math.min(e.clientY, window.innerHeight - 240)
        setContextMenu({ ...menu, x, y })
    }

    const download = async (report) => {
        if (!userId) return
        setError('')
        try {
            const res = await downloadPatientReport(userId, report.id)
            const blob = new Blob([res.data], { type: report.contentType || 'application/octet-stream' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = report.originalFileName || 'report'
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to download report')
        }
    }

    if (!canUse) {
        return (
            <div className="rounded-xl border p-6" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                <h1 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Medical Reports</h1>
                <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Please log in to view your reports.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
                        Medical Reports
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Organize your reports into folders, upload, and download them later.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        disabled={loading}
                    >
                        <RefreshCcw size={16} />
                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={openCreateFolder}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
                        style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    >
                        <Plus size={16} />
                        New folder
                    </button>

                    <label
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
                        style={{ backgroundColor: 'hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))' }}
                    >
                        <Upload size={16} />
                        Upload
                        <input
                            type="file"
                            className="hidden"
                            accept="application/pdf,image/png,image/jpeg"
                            multiple
                            onChange={(e) => {
                                const files = e.target.files
                                e.target.value = ''
                                openReview(files)
                            }}
                        />
                    </label>
                </div>
            </div>

            {error && (
                <p className="text-sm" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
            )}

            <section
                className="rounded-xl border p-4"
                style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                onContextMenu={(e) => {
                    // Box-level context menu (whitespace): paste into current folder/root.
                    openContextMenu(e, {
                        kind: 'background',
                        targetId: null,
                        folderIdForPaste: currentFolderId,
                    })
                }}
            >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        <button
                            type="button"
                            onClick={() => openFolder(ALL_FOLDER_ID)}
                            className="font-medium hover:underline"
                            style={{ color: 'hsl(var(--foreground))' }}
                        >
                            Reports
                        </button>
                        {folderPathIds.length > 0 && (
                            <>
                                {folderPathIds.map((id, idx) => {
                                    const isLast = idx === folderPathIds.length - 1
                                    return (
                                        <span key={id}>
                                            <span className="mx-2">/</span>
                                            {isLast ? (
                                                <span style={{ color: 'hsl(var(--foreground))' }}>{folderLabel(id, folders)}</span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => openFolder(id)}
                                                    className="font-medium hover:underline"
                                                    style={{ color: 'hsl(var(--foreground))' }}
                                                >
                                                    {folderLabel(id, folders)}
                                                </button>
                                            )}
                                        </span>
                                    )
                                })}
                            </>
                        )}
                    </div>

                    {currentFolderId !== ALL_FOLDER_ID && (
                        <button
                            onClick={() => openFolder(ALL_FOLDER_ID)}
                            className="px-3 py-2 rounded-lg border text-sm font-medium"
                            style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        >
                            Back to root
                        </button>
                    )}
                </div>

                <div className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Folders</h2>
                            <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                {isMobileLike ? 'Tap a folder to open.' : 'Click once to select, double-click to open.'}
                            </p>
                        </div>

                        {selectedFolderIds.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="px-3 py-2 rounded-lg border text-sm font-medium"
                                    style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                    onClick={() => openDelete(selectedFolderIds)}
                                    disabled={selectedFolderIds.every((id) => isSystemFolder(id))}
                                >
                                    Delete selected
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-2 rounded-lg border text-sm font-medium"
                                    style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                    onClick={clearSelection}
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {(
                            currentFolderId === ALL_FOLDER_ID
                                ? [{ id: UNCATEGORIZED_FOLDER_ID, name: 'Uncategorized', parentId: ALL_FOLDER_ID }, ...currentFolderChildFolders]
                                : currentFolderChildFolders
                        ).map((f) => {
                            const selected = selectedFolderIds.includes(f.id)
                            const menuOpen = folderMenuOpenId === f.id

                            const canEdit = !isSystemFolder(f.id)

                            return (
                                <div
                                    key={f.id}
                                    role="button"
                                    tabIndex={0}
                                    className="relative rounded-xl border p-4 text-left select-none"
                                    style={{
                                        backgroundColor: selected ? 'hsl(var(--secondary))' : 'transparent',
                                        borderColor: 'hsl(var(--border))',
                                        color: selected ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--foreground))',
                                        zIndex: menuOpen ? 20 : 'auto',
                                    }}
                                    onContextMenu={(e) => {
                                        setSelectedFolderIds([f.id])
                                        setSelectedFileIds([])
                                        openContextMenu(e, {
                                            kind: 'folder',
                                            targetId: f.id,
                                            folderIdForPaste: f.id,
                                        })
                                    }}
                                    onPointerDown={() => beginLongPress(f.id)}
                                    onPointerUp={cancelLongPress}
                                    onPointerCancel={cancelLongPress}
                                    onPointerMove={cancelLongPress}
                                    onClick={(e) => {
                                        cancelLongPress()
                                        if (menuOpen) return
                                        if (isMobileLike) {
                                            if (selectedFolderIds.length > 0) {
                                                toggleFolderSelection(f.id)
                                            } else {
                                                openFolder(f.id)
                                            }
                                            return
                                        }

                                        const toggle = e.metaKey || e.ctrlKey
                                        if (toggle) {
                                            toggleFolderSelection(f.id)
                                        } else {
                                            setSelectedFolderIds([f.id])
                                        }
                                    }}
                                    onDoubleClick={() => {
                                        if (!isMobileLike) openFolder(f.id)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') openFolder(f.id)
                                    }}
                                >
                                    <div className="absolute right-2 top-2">
                                        <button
                                            type="button"
                                            className="p-2 rounded-lg border"
                                            style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'inherit' }}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                openFolderMenu(f.id)
                                            }}
                                            aria-label="Folder actions"
                                            data-folder-menu="true"
                                        >
                                            <MoreVertical size={16} />
                                        </button>

                                        {menuOpen && (
                                            <div
                                                className="absolute right-0 mt-2 w-40 rounded-lg border overflow-hidden"
                                                style={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}
                                                data-folder-menu="true"
                                            >
                                                <button
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                                    style={{ color: 'hsl(var(--foreground))' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedFolderIds([f.id])
                                                        setSelectedFileIds([])
                                                        setClipboard({ mode: 'cut', folderIds: [f.id], fileIds: [] })
                                                        setFolderMenuOpenId(null)
                                                    }}
                                                    disabled={isSystemFolder(f.id)}
                                                    data-folder-menu="true"
                                                >
                                                    Cut
                                                </button>
                                                <button
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                                    style={{ color: 'hsl(var(--foreground))' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedFolderIds([f.id])
                                                        setSelectedFileIds([])
                                                        setClipboard({ mode: 'copy', folderIds: [f.id], fileIds: [] })
                                                        setFolderMenuOpenId(null)
                                                    }}
                                                    disabled={isSystemFolder(f.id)}
                                                    data-folder-menu="true"
                                                >
                                                    Copy
                                                </button>
                                                <button
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                                    style={{ color: 'hsl(var(--foreground))', opacity: canPaste ? 1 : 0.5 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (!canPaste) return
                                                        pasteInto(f.id)
                                                        setFolderMenuOpenId(null)
                                                    }}
                                                    disabled={!canPaste}
                                                    data-folder-menu="true"
                                                >
                                                    Paste
                                                </button>

                                                <button
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                                    style={{ color: 'hsl(var(--foreground))', opacity: canEdit ? 1 : 0.5 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (!canEdit) return
                                                        openFolderRename(f.id, f.name)
                                                    }}
                                                    disabled={!canEdit}
                                                    data-folder-menu="true"
                                                >
                                                    Rename
                                                </button>
                                                <button
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                                    style={{ color: 'hsl(var(--destructive))', opacity: canEdit ? 1 : 0.5 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (!canEdit) return
                                                        openDelete([f.id])
                                                    }}
                                                    disabled={!canEdit}
                                                    data-folder-menu="true"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-start gap-3 pr-10">
                                        <div className="mt-0.5">
                                            <Folder size={22} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium truncate">{f.name}</div>
                                            <div className="text-xs mt-1" style={{ opacity: 0.8 }}>
                                                {folderCounts[f.id] || 0} file(s)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="mt-6">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Files</h2>
                            <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                {currentFolderId === ALL_FOLDER_ID ? 'Uncategorized files in root.' : `Files in “${currentFolderName}”.`}
                            </p>
                        </div>
                        <div className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{visibleFileItems.length} item(s)</div>
                    </div>

                    <div
                        className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                        onContextMenu={(e) => {
                            // Background context menu: paste into current folder/root.
                            openContextMenu(e, {
                                kind: 'background',
                                targetId: null,
                                folderIdForPaste: currentFolderId,
                            })
                        }}
                    >
                        {loading ? (
                            <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Loading...</div>
                        ) : visibleFileItems.length === 0 ? (
                            <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                No files here.
                            </div>
                        ) : (
                            visibleFileItems.map((item) => {
                                const selected = selectedFileIds.includes(item.id)
                                const menuOpen = fileMenuOpenId === item.id
                                return (
                                    <div
                                        key={item.id}
                                        className="relative rounded-xl border p-4"
                                        style={{
                                            backgroundColor: selected ? 'hsl(var(--secondary))' : 'transparent',
                                            borderColor: 'hsl(var(--border))',
                                            zIndex: menuOpen ? 20 : 'auto',
                                        }}
                                        onContextMenu={(e) => {
                                            setSelectedFileIds([item.id])
                                            setSelectedFolderIds([])
                                            openContextMenu(e, {
                                                kind: 'file',
                                                targetId: item.id,
                                                folderIdForPaste: currentFolderId,
                                            })
                                        }}
                                        onClick={(e) => {
                                            setFolderMenuOpenId(null)
                                            setFileMenuOpenId(null)
                                            setContextMenu(null)
                                            const toggle = e.metaKey || e.ctrlKey
                                            setSelectedFileIds((prev) => {
                                                if (toggle) {
                                                    const set = new Set(prev)
                                                    if (set.has(item.id)) set.delete(item.id)
                                                    else set.add(item.id)
                                                    return Array.from(set)
                                                }
                                                return [item.id]
                                            })
                                        }}
                                    >
                                        <div className="absolute right-2 top-2">
                                            <button
                                                type="button"
                                                className="p-2 rounded-lg border"
                                                style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    openFileMenu(item.id)
                                                }}
                                                aria-label="File actions"
                                                data-file-menu="true"
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {fileMenuOpenId === item.id && (
                                                <div
                                                    className="absolute right-0 mt-2 w-40 rounded-lg border overflow-hidden"
                                                    style={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}
                                                    data-file-menu="true"
                                                >
                                                    <button
                                                        type="button"
                                                        className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                                        style={{ color: 'hsl(var(--foreground))' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSelectedFileIds([item.id])
                                                            setSelectedFolderIds([])
                                                            setClipboard({ mode: 'cut', folderIds: [], fileIds: [item.id] })
                                                            setFileMenuOpenId(null)
                                                        }}
                                                        data-file-menu="true"
                                                    >
                                                        Cut
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                                        style={{ color: 'hsl(var(--foreground))' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSelectedFileIds([item.id])
                                                            setSelectedFolderIds([])
                                                            setClipboard({ mode: 'copy', folderIds: [], fileIds: [item.id] })
                                                            setFileMenuOpenId(null)
                                                        }}
                                                        data-file-menu="true"
                                                    >
                                                        Copy
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                                        style={{ color: 'hsl(var(--foreground))', opacity: canPaste ? 1 : 0.5 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (!canPaste) return
                                                            paste()
                                                            setFileMenuOpenId(null)
                                                        }}
                                                        disabled={!canPaste}
                                                        data-file-menu="true"
                                                    >
                                                        Paste
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                                        style={{ color: 'hsl(var(--foreground))' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            openFileRename(item.id, fileDisplayName(item))
                                                        }}
                                                        data-file-menu="true"
                                                    >
                                                        Rename
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                                        style={{ color: 'hsl(var(--destructive))' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            deleteFileIds([item.id])
                                                        }}
                                                        data-file-menu="true"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
                                            {fileDisplayName(item)}
                                        </div>
                                        <div className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                            {item.report?.uploadedAt ? new Date(item.report.uploadedAt).toLocaleString() : '-'}
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    download(item.report)
                                                }}
                                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium"
                                                style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                            >
                                                <Download size={14} />
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </section>

            {reviewOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'hsl(var(--background) / 0.8)' }}
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeReview()
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-full max-w-3xl rounded-xl border overflow-hidden"
                        style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    >
                        <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                                        Review report before upload
                                    </h2>
                                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                        Confirm the selected file before uploading.
                                    </p>
                                </div>
                                <button
                                    onClick={closeReview}
                                    className="px-3 py-2 rounded-lg border text-sm font-medium"
                                    style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                    disabled={uploading}
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="rounded-lg border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                                        Files to upload ({pendingFiles.length})
                                    </div>

                                    <label
                                        className="px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer"
                                        style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                    >
                                        Add more
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="application/pdf,image/png,image/jpeg"
                                            multiple
                                            disabled={uploading}
                                            onChange={(e) => {
                                                const files = e.target.files
                                                e.target.value = ''
                                                setPendingFiles((prev) => mergeFiles(prev, Array.from(files || [])))
                                            }}
                                        />
                                    </label>
                                </div>

                                <div className="mt-3 rounded-lg border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
                                    <div className="max-h-48 overflow-auto">
                                        {pendingFiles.map((f, idx) => (
                                            <div
                                                key={`${f.name}|${f.size}|${f.lastModified}`}
                                                className="flex items-center justify-between gap-2 px-3 py-2 border-b last:border-b-0"
                                                style={{
                                                    borderColor: 'hsl(var(--border))',
                                                    backgroundColor: idx === activePendingIndex ? 'hsl(var(--secondary))' : 'transparent',
                                                }}
                                            >
                                                <button
                                                    onClick={() => setActivePendingIndex(idx)}
                                                    className="flex-1 text-left"
                                                    style={{ color: idx === activePendingIndex ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--foreground))' }}
                                                    disabled={uploading}
                                                >
                                                    <div className="text-sm font-medium truncate">{f.name}</div>
                                                    <div className="text-xs" style={{ opacity: 0.8 }}>
                                                        {f.type || 'unknown'} • {Math.max(1, Math.round(f.size / 1024))} KB
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => removePendingAt(idx)}
                                                    className="px-2 py-1 rounded-lg border text-xs"
                                                    style={{
                                                        backgroundColor: 'transparent',
                                                        borderColor: 'hsl(var(--border))',
                                                        color: idx === activePendingIndex ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--foreground))',
                                                    }}
                                                    disabled={uploading}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <div className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>Upload to folder</div>
                                    <select
                                        value={pendingFolderId}
                                        onChange={(e) => setPendingFolderId(e.target.value)}
                                        className="mt-2 w-full px-3 py-2 rounded-lg border text-sm"
                                        style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                        disabled={uploading}
                                    >
                                        <option value={UNCATEGORIZED_FOLDER_ID}>Uncategorized</option>
                                        {folders.map((f) => (
                                            <option key={f.id} value={f.id}>{folderPathLabel(f.id)}</option>
                                        ))}
                                    </select>

                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <input
                                            placeholder="New folder name"
                                            className="sm:col-span-2 w-full px-3 py-2 rounded-lg border text-sm"
                                            style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                            disabled={uploading}
                                            onKeyDown={(e) => {
                                                if (e.key !== 'Enter') return
                                                const parent = isRealFolderId(pendingFolderId) ? pendingFolderId : ALL_FOLDER_ID
                                                const id = createFolder(e.currentTarget.value, parent)
                                                if (id) {
                                                    setPendingFolderId(id)
                                                    e.currentTarget.value = ''
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="px-3 py-2 rounded-lg border text-sm font-medium"
                                            style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                            disabled={uploading}
                                            onClick={(e) => {
                                                const wrapper = e.currentTarget.parentElement
                                                const input = wrapper?.querySelector('input')
                                                const parent = isRealFolderId(pendingFolderId) ? pendingFolderId : ALL_FOLDER_ID
                                                const id = createFolder(input?.value, parent)
                                                if (id) {
                                                    setPendingFolderId(id)
                                                    if (input) input.value = ''
                                                }
                                            }}
                                        >
                                            Create
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-2">
                                    <button
                                        onClick={closeReview}
                                        className="px-3 py-2 rounded-lg border text-sm font-medium"
                                        style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                        disabled={uploading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmUpload}
                                        className="px-3 py-2 rounded-lg text-sm font-medium"
                                        style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                                        disabled={uploading || pendingFiles.length === 0}
                                    >
                                        {uploading ? 'Uploading…' : `Confirm upload (${pendingFiles.length})`}
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
                                <div className="px-4 py-3 border-b text-sm font-medium" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                                    Preview
                                </div>
                                <div className="p-4">
                                    {pendingFiles?.[activePendingIndex]?.type?.startsWith('image/') && pendingPreviewUrl ? (
                                        <img
                                            src={pendingPreviewUrl}
                                            alt="Report preview"
                                            className="w-full rounded-md border"
                                            style={{ borderColor: 'hsl(var(--border))' }}
                                        />
                                    ) : pendingFiles?.[activePendingIndex]?.type === 'application/pdf' && pendingPreviewUrl ? (
                                        <iframe
                                            title="PDF preview"
                                            src={pendingPreviewUrl}
                                            className="w-full rounded-md border"
                                            style={{ borderColor: 'hsl(var(--border))', height: 420 }}
                                        />
                                    ) : (
                                        <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                            Preview is available for PDF and image files.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {renameOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'hsl(var(--background) / 0.8)' }}
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setRenameOpen(false)
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-full max-w-lg rounded-xl border overflow-hidden"
                        style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    >
                        <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                            <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                                {renameTargetKind === 'file' ? 'Rename file' : 'Rename folder'}
                            </h2>
                        </div>
                        <div className="p-5">
                            <input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') confirmRename()
                                }}
                            />
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    onClick={() => setRenameOpen(false)}
                                    className="px-3 py-2 rounded-lg border text-sm font-medium"
                                    style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRename}
                                    className="px-3 py-2 rounded-lg text-sm font-medium"
                                    style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                                    disabled={!renameValue.trim()}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {createOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'hsl(var(--background) / 0.8)' }}
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setCreateOpen(false)
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-full max-w-lg rounded-xl border overflow-hidden"
                        style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    >
                        <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                            <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Create folder</h2>
                            <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                {isRealFolderId(currentFolderId) ? `Creates inside “${currentFolderName}”.` : 'Creates in root.'}
                            </p>
                        </div>
                        <div className="p-5">
                            <input
                                value={createValue}
                                onChange={(e) => setCreateValue(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                autoFocus
                                placeholder="Folder name"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') confirmCreateFolder()
                                }}
                            />
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    onClick={() => setCreateOpen(false)}
                                    className="px-3 py-2 rounded-lg border text-sm font-medium"
                                    style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmCreateFolder}
                                    className="px-3 py-2 rounded-lg text-sm font-medium"
                                    style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                                    disabled={!createValue.trim()}
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {deleteOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'hsl(var(--background) / 0.8)' }}
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setDeleteOpen(false)
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-full max-w-lg rounded-xl border overflow-hidden"
                        style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    >
                        <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                            <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Delete folders</h2>
                            <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                Deletes selected folders and removes all reports inside them from this UI.
                            </p>
                        </div>
                        <div className="p-5">
                            <div className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                                Selected: <span style={{ color: 'hsl(var(--foreground))' }}>{collectDescendants(deleteTargetIds).filter((id) => !isSystemFolder(id)).length}</span>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    onClick={() => setDeleteOpen(false)}
                                    className="px-3 py-2 rounded-lg border text-sm font-medium"
                                    style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-3 py-2 rounded-lg text-sm font-medium"
                                    style={{ backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
                                    disabled={collectDescendants(deleteTargetIds).filter((id) => !isSystemFolder(id)).length === 0}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {contextMenu ? (
                <div
                    className="fixed z-50"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    data-context-menu="true"
                >
                    <div
                        className="w-44 rounded-lg border overflow-hidden"
                        style={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}
                        data-context-menu="true"
                    >
                        {contextMenu.kind !== 'background' ? (
                            <>
                                <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                    style={{ color: 'hsl(var(--foreground))' }}
                                    onClick={() => {
                                        if (contextMenu.kind === 'folder') {
                                            const id = contextMenu.targetId
                                            if (!id || isSystemFolder(id)) return
                                            setClipboard({ mode: 'cut', folderIds: [id], fileIds: [] })
                                        } else if (contextMenu.kind === 'file') {
                                            const id = contextMenu.targetId
                                            if (!id) return
                                            setClipboard({ mode: 'cut', folderIds: [], fileIds: [id] })
                                        }
                                        setContextMenu(null)
                                    }}
                                    disabled={contextMenu.kind === 'folder' && isSystemFolder(contextMenu.targetId)}
                                    data-context-menu="true"
                                >
                                    Cut
                                </button>
                                <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                    style={{ color: 'hsl(var(--foreground))' }}
                                    onClick={() => {
                                        if (contextMenu.kind === 'folder') {
                                            const id = contextMenu.targetId
                                            if (!id || isSystemFolder(id)) return
                                            setClipboard({ mode: 'copy', folderIds: [id], fileIds: [] })
                                        } else if (contextMenu.kind === 'file') {
                                            const id = contextMenu.targetId
                                            if (!id) return
                                            setClipboard({ mode: 'copy', folderIds: [], fileIds: [id] })
                                        }
                                        setContextMenu(null)
                                    }}
                                    disabled={contextMenu.kind === 'folder' && isSystemFolder(contextMenu.targetId)}
                                    data-context-menu="true"
                                >
                                    Copy
                                </button>
                            </>
                        ) : null}

                        <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                            style={{ color: 'hsl(var(--foreground))', opacity: canPaste ? 1 : 0.5 }}
                            onClick={() => {
                                if (!canPaste) return
                                pasteInto(contextMenu.folderIdForPaste)
                                setContextMenu(null)
                            }}
                            disabled={!canPaste}
                            data-context-menu="true"
                        >
                            Paste
                        </button>

                        {contextMenu.kind !== 'background' ? (
                            <>
                                <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                    style={{ color: 'hsl(var(--foreground))', opacity: contextMenu.kind === 'folder' && isSystemFolder(contextMenu.targetId) ? 0.5 : 1 }}
                                    onClick={() => {
                                        if (contextMenu.kind === 'folder') {
                                            const id = contextMenu.targetId
                                            if (!id || isSystemFolder(id)) return
                                            openFolderRename(id, folderLabel(id, folders))
                                        } else if (contextMenu.kind === 'file') {
                                            const id = contextMenu.targetId
                                            const item = visibleFileItems.find((it) => it.id === id)
                                            if (!id || !item) return
                                            openFileRename(id, fileDisplayName(item))
                                        }
                                        setContextMenu(null)
                                    }}
                                    disabled={contextMenu.kind === 'folder' && isSystemFolder(contextMenu.targetId)}
                                    data-context-menu="true"
                                >
                                    Rename
                                </button>
                                <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                                    style={{ color: 'hsl(var(--destructive))', opacity: contextMenu.kind === 'folder' && isSystemFolder(contextMenu.targetId) ? 0.5 : 1 }}
                                    onClick={() => {
                                        if (contextMenu.kind === 'folder') {
                                            const id = contextMenu.targetId
                                            if (!id || isSystemFolder(id)) return
                                            openDelete([id])
                                        } else if (contextMenu.kind === 'file') {
                                            const id = contextMenu.targetId
                                            if (!id) return
                                            deleteFileIds([id])
                                        }
                                        setContextMenu(null)
                                    }}
                                    disabled={contextMenu.kind === 'folder' && isSystemFolder(contextMenu.targetId)}
                                    data-context-menu="true"
                                >
                                    Delete
                                </button>
                            </>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    )
}

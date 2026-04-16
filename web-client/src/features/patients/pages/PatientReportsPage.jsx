import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/context/AuthContext'
import {
    copyPatientReport,
    createPatientReportFolder,
    deletePatientReport,
    deletePatientReportFolder,
    downloadPatientReport,
    listPatientReports,
    listPatientReportFolders,
    updatePatientReport,
    updatePatientReportFolder,
    uploadPatientReportToFolder,
} from '@/features/patients/services/patientApi'
import { Download, Upload, RefreshCcw, Folder, MoreVertical, Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const ALL_FOLDER_ID = '__all__'
const UNCATEGORIZED_FOLDER_ID = '__uncategorized__'

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
    const uploadInputRef = useRef(null)

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

    const loadFolders = async () => {
        if (!userId) return []
        try {
            const data = await listPatientReportFolders(userId)
            const list = Array.isArray(data) ? data : []
            const mapped = list
                .filter((f) => f && typeof f.id === 'string' && typeof f.name === 'string')
                .map((f) => ({
                    id: f.id,
                    name: f.name,
                    parentId: typeof f.parentId === 'string' && f.parentId ? f.parentId : ALL_FOLDER_ID,
                }))
            setFolders(mapped)
            return mapped
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to load folders')
            setFolders([])
            return []
        }
    }

    useEffect(() => {
        if (!userId) return
        setCurrentFolderId(ALL_FOLDER_ID)
        setSelectedFolderIds([])
        setSelectedFileIds([])
        setClipboard(null)
        setAssignments({})
        setHiddenReportIds([])
        setShortcuts([])
        setNameOverrides({})
        loadFolders()
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const syncAssignmentsFromReports = (reportList) => {
        const validFolderIds = new Set(folders.map((f) => f.id))
        const next = {}
        for (const r of reportList || []) {
            const reportId = r?.id
            if (!reportId) continue
            const folderId = typeof r.folderId === 'string' && r.folderId ? r.folderId : null
            if (folderId && validFolderIds.has(folderId)) next[reportId] = folderId
        }
        setAssignments(next)
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
        syncAssignmentsFromReports(reports)
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
            const folderId = isRealFolderId(pendingFolderId) ? pendingFolderId : null
            for (const f of pendingFiles) {
                await uploadPatientReportToFolder(userId, f, folderId)
            }

            await load()
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
        return counts
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reports, assignments, folders, hiddenReportIds])

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
        return items
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reports, currentFolderId, assignments, folders, hiddenReportIds, reportById])

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

    const createFolder = async (name, parentId) => {
        const trimmed = (name || '').trim()
        if (!trimmed) return null
        if (!userId) return null

        const normalizedParent = isRealFolderId(parentId) ? parentId : null

        const created = await createPatientReportFolder(userId, {
            name: trimmed,
            parentId: normalizedParent,
        })

        const mapped = {
            id: created.id,
            name: created.name,
            parentId: typeof created.parentId === 'string' && created.parentId ? created.parentId : ALL_FOLDER_ID,
        }

        setFolders((prev) => {
            const next = (prev || []).filter((f) => f?.id !== mapped.id)
            next.push(mapped)
            return next
        })

        return mapped.id
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

    const confirmRename = async () => {
        const id = renameTargetId
        const name = renameValue.trim()
        if (!id || !name || !userId) return

        setError('')

        try {
            if (renameTargetKind === 'folder') {
                if (isSystemFolder(id)) return
                const updated = await updatePatientReportFolder(userId, id, { name })
                const mapped = {
                    id: updated.id,
                    name: updated.name,
                    parentId: typeof updated.parentId === 'string' && updated.parentId ? updated.parentId : ALL_FOLDER_ID,
                }
                setFolders((prev) => (prev || []).map((f) => (f.id === id ? mapped : f)))
            } else if (renameTargetKind === 'file') {
                const reportId = id.startsWith('report:') ? id.slice('report:'.length) : id
                await updatePatientReport(userId, reportId, { displayFileName: name })
                setReports((prev) => (prev || []).map((r) => (r?.id === reportId ? { ...r, displayFileName: name } : r)))
            }

            setRenameOpen(false)
            setRenameTargetId(null)
            setRenameTargetKind(null)
            setFolderMenuOpenId(null)
            setFileMenuOpenId(null)
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to rename')
        }
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

    const confirmDelete = async () => {
        if (!userId) return
        const idsToDelete = collectDescendants(deleteTargetIds).filter((id) => !isSystemFolder(id))
        if (idsToDelete.length === 0) {
            setDeleteOpen(false)
            return
        }

        setError('')
        try {
            // Delete each selected folder root; backend cascades descendants + soft-deletes reports inside.
            const unique = Array.from(new Set(idsToDelete))
            for (const id of unique) {
                await deletePatientReportFolder(userId, id)
            }

            if (unique.includes(currentFolderId)) {
                setCurrentFolderId(ALL_FOLDER_ID)
            }

            setSelectedFolderIds([])
            setDeleteOpen(false)
            setDeleteTargetIds([])
            setFolderMenuOpenId(null)

            await Promise.all([loadFolders(), load()])
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to delete folder')
        }
    }

    const deleteSelectedFiles = () => {
        if (selectedFileIds.length === 0) return
        deleteFileIds(selectedFileIds)
    }

    const deleteFileIds = async (fileIds) => {
        const ids = (fileIds || []).filter(Boolean)
        if (ids.length === 0 || !userId) return

        setError('')
        try {
            for (const fid of ids) {
                const reportId = fid.startsWith('report:') ? fid.slice('report:'.length) : fid
                if (!reportId) continue
                await deletePatientReport(userId, reportId)
            }

            setSelectedFileIds((prev) => prev.filter((id) => !ids.includes(id)))
            setFileMenuOpenId(null)
            await load()
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to delete file')
        }
    }

    const fileDisplayName = (fileItem) => {
        return fileItem?.report?.displayFileName || fileItem?.report?.originalFileName || 'Report'
    }

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

    const pasteWithDestination = async (destParent, destFileFolder) => {
        if (!clipboard || !userId) return
        const mode = clipboard.mode

        setError('')
        try {
            const normalizedDestParent = isRealFolderId(destParent) ? destParent : null
            const normalizedDestFileFolder = isRealFolderId(destFileFolder) ? destFileFolder : null

            // Folders
            if (clipboard.folderIds?.length) {
                const roots = clipboard.folderIds.filter((id) => isRealFolderId(id))

                if (mode === 'cut') {
                    // Prevent moving a folder into itself/its descendants.
                    const forbidden = new Set(collectDescendants(roots))
                    if (normalizedDestParent && forbidden.has(normalizedDestParent)) {
                        setError('Cannot move a folder into itself.')
                    } else {
                        for (const id of roots) {
                            await updatePatientReportFolder(userId, id, { parentId: normalizedDestParent })
                        }
                    }
                } else if (mode === 'copy') {
                    const toCopy = collectDescendants(roots)

                    const depthOf = (id) => {
                        let d = 0
                        let cur = folderById.get(id)
                        const seen = new Set()
                        while (cur && cur.parentId && cur.parentId !== ALL_FOLDER_ID && !seen.has(cur.parentId)) {
                            seen.add(cur.parentId)
                            d += 1
                            cur = folderById.get(cur.parentId)
                        }
                        return d
                    }

                    const ordered = [...toCopy].sort((a, b) => depthOf(a) - depthOf(b))
                    const mapOldToNew = new Map()

                    for (const oldId of ordered) {
                        const old = folderById.get(oldId)
                        if (!old) continue
                        const oldParent = old.parentId
                        const newParent = roots.includes(oldId)
                            ? normalizedDestParent
                            : (mapOldToNew.get(oldParent) || normalizedDestParent)

                        const created = await createPatientReportFolder(userId, {
                            name: old.name,
                            parentId: newParent || undefined,
                        })
                        mapOldToNew.set(oldId, created.id)
                    }

                    // Copy reports in the folder tree.
                    for (const r of reports) {
                        if (!r?.id) continue
                        const folderId = typeof r.folderId === 'string' && r.folderId ? r.folderId : null
                        if (!folderId || !toCopy.includes(folderId)) continue
                        const newFolderId = mapOldToNew.get(folderId)
                        if (!newFolderId) continue
                        await copyPatientReport(userId, r.id, { folderId: newFolderId })
                    }
                }
            }

            // Files
            if (clipboard.fileIds?.length) {
                const reportIds = clipboard.fileIds
                    .map((fid) => (fid.startsWith('report:') ? fid.slice('report:'.length) : fid))
                    .filter(Boolean)

                if (mode === 'cut') {
                    for (const rid of reportIds) {
                        await updatePatientReport(userId, rid, { folderId: normalizedDestFileFolder })
                    }
                } else if (mode === 'copy') {
                    for (const rid of reportIds) {
                        await copyPatientReport(userId, rid, { folderId: normalizedDestFileFolder })
                    }
                }
            }

            if (clipboard.mode === 'cut') setClipboard(null)
            setSelectedFolderIds([])
            setSelectedFileIds([])
            setFolderMenuOpenId(null)
            setFileMenuOpenId(null)

            await Promise.all([loadFolders(), load()])
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Paste failed')
        }
    }

    const paste = async () => {
        const { destParent, destFileFolder } = resolvePasteDestination(currentFolderId)
        await pasteWithDestination(destParent, destFileFolder)
    }

    const pasteInto = async (targetFolderId) => {
        const { destParent, destFileFolder } = resolvePasteDestination(targetFolderId)
        await pasteWithDestination(destParent, destFileFolder)
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

    const confirmCreateFolder = async () => {
        const parentId = isRealFolderId(currentFolderId) ? currentFolderId : ALL_FOLDER_ID
        try {
            const id = await createFolder(createValue, parentId)
            if (!id) return
            setCreateOpen(false)
            setCreateValue('')
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Failed to create folder')
        }
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

                    <button
                        type="button"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: 'hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))' }}
                        onClick={() => {
                            setFolderMenuOpenId(null)
                            setFileMenuOpenId(null)
                            setContextMenu(null)
                            uploadInputRef.current?.click?.()
                        }}
                    >
                        <Upload size={16} />
                        Upload
                    </button>

                    <input
                        ref={uploadInputRef}
                        type="file"
                        className="hidden"
                        accept="application/pdf,image/png,image/jpeg"
                        multiple
                        onChange={(e) => {
                            const picked = Array.from(e.target.files || [])
                            e.target.value = ''
                            openReview(picked)
                        }}
                    />
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
                            Array.from({ length: 6 }).map((_, idx) => (
                                <div
                                    key={`file-skeleton-${idx}`}
                                    className="rounded-xl border p-4"
                                    style={{ backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }}
                                >
                                    <div className="flex items-start gap-3">
                                        <Skeleton className="h-9 w-9 rounded-lg" />
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                        <Skeleton className="h-6 w-6 rounded-md" />
                                    </div>
                                </div>
                            ))
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

            {reviewOpen
                ? createPortal(
                    <div
                        className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
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
                                                    const picked = Array.from(e.target.files || [])
                                                    e.target.value = ''
                                                    setPendingFiles((prev) => mergeFiles(prev, picked))
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
                                                onKeyDown={async (e) => {
                                                    if (e.key !== 'Enter') return
                                                    const parent = isRealFolderId(pendingFolderId) ? pendingFolderId : ALL_FOLDER_ID
                                                    const id = await createFolder(e.currentTarget.value, parent)
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
                                                onClick={async (e) => {
                                                    const wrapper = e.currentTarget.parentElement
                                                    const input = wrapper?.querySelector('input')
                                                    const parent = isRealFolderId(pendingFolderId) ? pendingFolderId : ALL_FOLDER_ID
                                                    const id = await createFolder(input?.value, parent)
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
                    </div>,
                    document.body,
                )
                : null}

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

import { useState, useMemo, useRef, useEffect, useLayoutEffect, type Ref } from 'react'
import { Plus, Search, X, Settings, FolderOpen, Folder, ChevronDown, ChevronRight, MoreHorizontal, Copy, Pin, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAppStore, Conversation } from '../store'
import { useT } from '../lib/i18n'
import Tooltip from './Tooltip'
import { createPortal } from 'react-dom'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}

interface Props { onOpenSettings: () => void; isCollapsed: boolean; onToggle: () => void; width?: number; innerRef?: Ref<HTMLDivElement> }

export default function Sidebar({ onOpenSettings, isCollapsed, onToggle, width, innerRef }: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const t = useT()

  const {
    conversations, activeConversationId, setActiveConversation,
    addConversation, updateConversation, deleteConversation,
    activeProjectId, setActiveProject, projects, removeProject,
    settings, updateSettings
  } = useAppStore()

  const folderCollapsed = new Set(settings.collapsedFolders ?? [])

  function toggleFolderCollapse(id: string) {
    const next = new Set(folderCollapsed)
    next.has(id) ? next.delete(id) : next.add(id)
    updateSettings({ collapsedFolders: Array.from(next) })
  }

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter(c => c.title.toLowerCase().includes(q))
  }, [conversations, searchQuery])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.createdAt - a.createdAt
  }), [filtered])

  const grouped = useMemo(() => {
    const map = new Map<string, Conversation[]>()
    for (const c of sorted) {
      if (!map.has(c.projectId)) map.set(c.projectId, [])
      map.get(c.projectId)!.push(c)
    }
    return map
  }, [sorted])

  function getGroupLabel(projectId: string) {
    if (projectId === 'default') return 'default'
    return projects.find(p => p.id === projectId)?.name ?? projectId
  }

  function handleNew() {
    setActiveConversation(null)
  }

  return (
    <div ref={innerRef} className="flex flex-col h-full no-drag" style={{ background: 'var(--bg-sidebar)', width: width ?? 240 }}>

      {/* 第1行：收起按钮 — 与右侧标题行同高 */}
      <div className="flex items-center px-4 h-12">
        <Tooltip label={t('sidebar.collapse')} side="bottom" align="start">
          <button
            onClick={onToggle}
            className="no-drag p-1 rounded transition-colors"
            style={{ color: '#b8b8c2' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = '#b8b8c2'}
          >
            <PanelLeftClose size={16} />
          </button>
        </Tooltip>
      </div>

      {/* 第2行：对话标题 + 搜索图标 */}
      <div className="flex items-center justify-between px-4 pb-2">
        <span className="text-[13px] truncate" style={{ color: 'var(--text-secondary)' }}>{t('sidebar.conversations')}</span>
        <button
          onClick={() => { setSearchOpen(v => !v); setSearchQuery('') }}
          className="no-drag transition-colors"
          style={{ color: '#b8b8c2' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Search size={17} />
        </button>
      </div>

      {/* 搜索框 */}
      {searchOpen && (
        <div className="px-3 pb-2 no-drag">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
            style={{ background: 'var(--bg-segment)', borderColor: 'var(--border)' }}>
            <Search size={13} style={{ color: 'var(--text-placeholder)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('sidebar.search')}
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            <button onClick={() => { setSearchOpen(false); setSearchQuery('') }}
              style={{ color: 'var(--text-placeholder)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-placeholder)'}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto px-2 space-y-3 no-drag">
        {grouped.size === 0 && (
          <p className="text-[13px] text-center py-8" style={{ color: 'var(--text-placeholder)' }}>{t('sidebar.empty')}</p>
        )}

        {/* 新建对话按钮 */}
        <div
          className="rounded-lg px-2 py-2 transition-colors flex items-center gap-1.5"
          onClick={handleNew}
          onMouseEnter={e => e.currentTarget.style.background = '#f0f0f1'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Plus size={16} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {t('sidebar.newChat')}
          </span>
        </div>

        {/* 置顶对话 */}
        {(() => {
          const pinned = filtered.filter(c => c.pinned).sort((a, b) => b.updatedAt - a.updatedAt)
          if (pinned.length === 0) return null
          return (
            <div className="space-y-0.5">
              {pinned.map(c => (
                <ConvItem
                  key={c.id}
                  conv={c}
                  active={activeConversationId === c.id}
                  onSelect={() => {
                    setActiveConversation(c.id)
                    setActiveProject(c.projectId === 'default' ? null : c.projectId)
                  }}
                  onPin={() => updateConversation(c.id, { pinned: !c.pinned })}
                  onDelete={() => deleteConversation(c.id)}
                />
              ))}
            </div>
          )
        })()}

        {/* 非置顶对话：按文件夹分组 */}
        {Array.from(grouped.entries()).map(([projectId, convs]) => {
          const unpinned = convs.filter(c => !c.pinned)
          const label = getGroupLabel(projectId)
          const isFolded = folderCollapsed.has(projectId)
          const showEmpty = !isFolded && unpinned.length === 0

          return (
            <div key={projectId}>
              <FolderHeader
                projectId={projectId}
                label={label}
                path={projects.find(p => p.id === projectId)?.path}
                collapsed={isFolded}
                onToggle={() => toggleFolderCollapse(projectId)}
                onDeleteAll={() => {
                  convs.forEach(c => deleteConversation(c.id))
                  if (projectId !== 'default') removeProject(projectId)
                }}
                t={t}
              />
              {!isFolded && (
                <div className="space-y-0.5">
                  {unpinned.map(c => (
                    <ConvItem
                      key={c.id}
                      conv={c}
                      active={activeConversationId === c.id}
                      onSelect={() => {
                        setActiveConversation(c.id)
                        setActiveProject(c.projectId === 'default' ? null : c.projectId)
                      }}
                      onPin={() => updateConversation(c.id, { pinned: !c.pinned })}
                      onDelete={() => deleteConversation(c.id)}
                    />
                  ))}
                  {showEmpty && (
                    <div className="px-2 py-1.5 text-[11px] text-center" style={{ color: 'var(--text-placeholder)' }}>
                      {t('sidebar.empty')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 底部 */}
      <div className="px-3 py-3 border-t no-drag" style={{ borderColor: 'var(--border-light)' }}>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[14px] transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-sidebar-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <Settings size={15} />
          {t('sidebar.settings')}
        </button>
      </div>
    </div>
  )
}

function FolderHeader({ projectId, label, path, collapsed, onToggle, onDeleteAll, t }: {
  projectId: string; label: string; path?: string; collapsed: boolean
  onToggle: () => void; onDeleteAll: () => void; t: (key: any) => string
}) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const showActions = hovered || menuOpen
  const showBackground = hovered && !menuOpen
  const FolderIcon = collapsed ? Folder : FolderOpen

  async function resolvePath(): Promise<string> {
    return path ?? (projectId === 'default' ? await window.api.defaultWorkspace() : '')
  }

  return (
    <div
      ref={rowRef}
      className="group relative flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
      style={{
        background: showBackground ? '#ebf7f3' : 'transparent',
        cursor: menuOpen ? 'default' : 'pointer'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onToggle}
    >
      <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 14, color: '#8A8A8A' }}>
        {showActions
          ? (collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />)
          : <FolderIcon size={13} />}
      </span>
      <span className="text-[13px] font-medium truncate flex-1 cursor-default" style={{ color: '#5A5A5A' }}>{label}</span>

      {/* 右侧操作按钮 */}
      {showActions && (
        <div
          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pl-2"
          style={{ background: showBackground ? '#ebf7f3' : 'transparent' }}
          onClick={e => e.stopPropagation()}
        >
          <button
            ref={btnRef}
            onClick={() => setMenuOpen(v => !v)}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-placeholder)', cursor: menuOpen ? 'default' : undefined }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-placeholder)'}
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && createPortal(
              <FolderMenu anchorRef={btnRef} rowRef={rowRef} t={t}
                onClose={() => setMenuOpen(false)}
                onOpen={() => { resolvePath().then(p => { if (p) window.api.openPath(p) }); setMenuOpen(false) }}
                onCopy={() => { resolvePath().then(p => { if (p) navigator.clipboard.writeText(p) }); setMenuOpen(false) }}
                onDeleteAll={() => { onDeleteAll(); setMenuOpen(false) }}
              />,
              document.getElementById('zoom-portal') ?? document.body
            )}
        </div>
      )}
    </div>
  )
}

function FolderMenu({ anchorRef, rowRef, onClose, onOpen, onCopy, onDeleteAll, t }: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  rowRef: React.RefObject<HTMLDivElement | null>
  onClose: () => void; onOpen: () => void; onCopy: () => void; onDeleteAll: () => void; t: (key: any) => string
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const sansSize = useAppStore(s => s.settings.sansSize ?? 13)
  const scale = sansSize / 14.5

  useLayoutEffect(() => {
    function updatePosition() {
      if (!anchorRef.current || !menuRef.current) return
      const anchorRect = anchorRef.current.getBoundingClientRect()
      const rowRect = rowRef.current?.getBoundingClientRect()
      const menuRect = menuRef.current.getBoundingClientRect()
      const menuWidth = menuRect.width || 140
      const menuHeight = menuRect.height || 120

      const s = scale || 1
      const vw = window.innerWidth / s
      const vh = window.innerHeight / s

      let top = anchorRect.bottom / s - 2
      const rowRight = rowRect ? rowRect.right / s : anchorRect.right / s
      const rowLeft = rowRect ? rowRect.left / s : anchorRect.left / s
      let left = rowRight - menuWidth + 85
      if (left < rowLeft) left = rowLeft

      if (top + menuHeight > vh - 8) {
        top = anchorRect.top / s - menuHeight - 4
      }
      top = Math.max(8, top) - 6
      if (left + menuWidth > vw - 8) left = vw - menuWidth - 8
      left = Math.max(8, left)

      setPos({ top, left })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorRef, rowRef, scale])

  const itemStyle = { color: 'var(--text-primary)', fontSize: 13 }
  const dangerStyle = { color: '#ef4444', fontSize: 13 }
  const hoverGreen = (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = '#eefaf5')
  const hoverClear = (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = 'transparent')

  return (
    <>
      {/* 透明遮罩：点击菜单外区域关闭，优先级低于菜单本身 */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onMouseDown={onClose} />
      <div
        ref={menuRef}
        className="rounded-lg border shadow-md overflow-hidden"
        style={{
          position: 'fixed',
          top: pos?.top ?? 0,
          left: pos?.left ?? 0,
          visibility: pos ? 'visible' : 'hidden',
          minWidth: 140,
          background: '#ffffff',
          borderColor: 'var(--border)',
          zIndex: 10000
        }}
      >
        <button className="w-full flex items-center px-3 py-2 text-left transition-colors"
          style={itemStyle} onClick={onOpen}
          onMouseEnter={hoverGreen} onMouseLeave={hoverClear}>
          {t('folder.open')}
        </button>
        <button className="w-full flex items-center px-3 py-2 text-left transition-colors"
          style={itemStyle} onClick={onCopy}
          onMouseEnter={hoverGreen} onMouseLeave={hoverClear}>
          {t('folder.copyPath')}
        </button>
        <div className="my-1 border-t" style={{ borderColor: 'var(--border-light)' }} />
        {confirmDelete ? (
          <button className="w-full flex items-center px-3 py-2 text-left transition-colors"
            style={dangerStyle} onClick={onDeleteAll}
            onMouseEnter={hoverGreen} onMouseLeave={hoverClear}>
            {t('folder.confirmDelete')}
          </button>
        ) : (
          <button className="w-full flex items-center px-3 py-2 text-left transition-colors"
            style={dangerStyle}
            onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
            onMouseEnter={hoverGreen} onMouseLeave={hoverClear}>
            {t('folder.deleteAll')}
          </button>
        )}
      </div>
    </>
  )
}

function ConvItem({ conv, active, onSelect, onPin, onDelete }: {
  conv: Conversation; active: boolean
  onSelect: () => void; onPin: () => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteTimer, setDeleteTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [animating, setAnimating] = useState<'pin-down' | 'unpin-down' | null>(null)
  const { loadingConv, unreadConvs } = useAppStore()
  const isLoading = loadingConv === conv.id
  const isUnread = unreadConvs.includes(conv.id)
  const t = useT()

  useEffect(() => {
    return () => { if (deleteTimer) clearTimeout(deleteTimer) }
  }, [deleteTimer])

  function startDeleteConfirm(e: React.MouseEvent) {
    e.stopPropagation()
    if (deleteConfirm) { onDelete(); setDeleteConfirm(false); return }
    setDeleteConfirm(true)
  }

  function handleLeave() { if (deleteConfirm) setDeleteConfirm(false) }

  function handleConfirmEnter() {
    if (!deleteConfirm) return
    const timer = setTimeout(() => { setDeleteConfirm(false) }, 3000)
    setDeleteTimer(timer)
  }

  function handleConfirmLeave() {
    if (deleteTimer) { clearTimeout(deleteTimer); setDeleteTimer(null) }
  }

  function handlePin(e: React.MouseEvent) {
    e.stopPropagation()
    const goingDown = !conv.pinned
    setAnimating(goingDown ? 'pin-down' : 'unpin-down')
    onPin()
    setTimeout(() => setAnimating(null), 200)
  }

  const animClass = animating === 'pin-down'
    ? 'animate-slide-down-fast'
    : animating === 'unpin-down'
      ? 'animate-slide-down-fast'
      : ''

  return (
    <div
      className={`relative rounded-lg px-2 py-2 cursor-pointer transition-colors ${animClass}`}
      style={{
        background: active ? '#ddf3ec' : hovered ? '#ebf7f3' : 'transparent',
        transition: 'background 0.15s, transform 0.2s, opacity 0.15s'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); handleLeave() }}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 min-w-0">
        {conv.pinned && hovered ? (
          // 置顶 + 悬停 → 取消置顶按钮
          <Tooltip label={t('sidebar.unpin')} side="right">
            <button onClick={handlePin} className="flex-shrink-0" style={{ color: '#9A9A9A' }}>
              <Pin size={15} style={{ transform: 'rotate(-45deg)' }} />
            </button>
          </Tooltip>
        ) : isLoading ? (
          // 正在加载 → 转圈
          <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 15, height: 15 }}>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#9A9A9A' }}>
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="17 10" />
            </svg>
          </div>
        ) : isUnread ? (
          // 有未读 → 绿点
          <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 15 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#26C6C0', flexShrink: 0 }} />
          </div>
        ) : conv.pinned ? (
          // 置顶 + 非悬停 + 无状态 → Pin 按钮
          <Tooltip label={t('sidebar.unpin')} side="right">
            <button onClick={handlePin} className="flex-shrink-0" style={{ color: '#9A9A9A' }}>
              <Pin size={15} style={{ transform: 'rotate(-45deg)' }} />
            </button>
          </Tooltip>
        ) : (
          // 未置顶 + 无状态 → 空白占位
          <div className="flex-shrink-0" style={{ width: 15 }} />
        )}
        <p className="text-[13px] truncate flex-1 min-w-0" style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {conv.title}
        </p>
        <span className="text-[12px] flex-shrink-0 whitespace-nowrap" style={{ color: '#9A9A9A' }}>{timeAgo(conv.createdAt)}</span>
      </div>

      {/* 未置顶对话：悬停时左侧置顶 + 右侧删除 */}
      {hovered && !conv.pinned && (
        <>
          <div className="absolute left-2 inset-y-0 flex items-center"
            style={{ background: active ? '#ddf3ec' : '#ebf7f3' }}
          >
            <Tooltip label={t('sidebar.pin')}>
              <button onClick={handlePin} className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-placeholder)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-placeholder)' }}
              >
                <Pin size={14} />
              </button>
            </Tooltip>
          </div>

          {/* 右侧删除按钮 — 绝对定位在 ConvItem 内部 */}
          <div
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pl-2"
            style={{ background: active ? '#ddf3ec' : hovered ? '#ebf7f3' : 'transparent', minWidth: 0 }}
            onClick={e => e.stopPropagation()}
          >
            {deleteConfirm ? (
              <button
                onClick={startDeleteConfirm}
                onMouseEnter={handleConfirmEnter}
                onMouseLeave={() => { handleConfirmLeave(); handleLeave() }}
                className="flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors"
                style={{ background: '#fef2f2', color: '#ef4444' }}
              >
                确认
              </button>
            ) : (
              <Tooltip label={t('sidebar.delete')}>
                <button
                  onClick={startDeleteConfirm}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: 'var(--text-placeholder)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-placeholder)' }}
                >
                  <Trash2 size={14} />
                </button>
              </Tooltip>
            )}
          </div>
        </>
      )}

      {/* 置顶对话：悬停时右侧只显示删除 */}
      {hovered && conv.pinned && (
        <div
          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pl-2"
          style={{ background: active ? '#ddf3ec' : hovered ? '#ebf7f3' : 'transparent' }}
          onClick={e => e.stopPropagation()}
        >
          {deleteConfirm ? (
            <button
              onClick={startDeleteConfirm}
              onMouseEnter={handleConfirmEnter}
              onMouseLeave={() => { handleConfirmLeave(); handleLeave() }}
              className="flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors"
              style={{ background: '#fef2f2', color: '#ef4444' }}
            >
              确认
            </button>
          ) : (
            <Tooltip label={t('sidebar.delete')}>
              <button
                onClick={startDeleteConfirm}
                className="p-1.5 rounded transition-colors"
                style={{ color: 'var(--text-placeholder)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-placeholder)' }}
              >
                <Trash2 size={14} />
              </button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  )
}

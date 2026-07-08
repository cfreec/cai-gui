import { useState, useRef, useEffect } from 'react'
import { FolderOpen, ChevronDown, Plus } from 'lucide-react'
import { useAppStore, Project } from '../store'
import { useT } from '../lib/i18n'

export default function WelcomePage() {
  const { projects, activeProjectId, setActiveProject, addProject } = useAppStore()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const current = projects.find(p => p.id === activeProjectId)
  const t = useT()

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleAddProject() {
    const path = await window.api.selectFolder()
    if (!path) return
    const name = path.split(/[\\/]/).pop() ?? path
    const project: Project = { id: crypto.randomUUID(), name, path }
    addProject(project)
    setActiveProject(project.id)
    setOpen(false)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 select-none"
      style={{ background: 'var(--bg-app)' }}>

      {/* Claude 星芒 logo */}
      <div className="flex items-center justify-center"
        style={{ width: 110, height: 110, borderRadius: '50%', background: '#F5F5F3' }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path d="M32 4L38 24L58 32L38 40L32 60L26 40L6 32L26 24L32 4Z" fill="#D97757"/>
          <path d="M32 16L36 26L46 32L36 38L32 48L28 38L18 32L28 26L32 16Z" fill="#E8906A" opacity="0.6"/>
        </svg>
      </div>

      {/* Let's build */}
      <h1 style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontStyle: 'italic',
        fontSize: 52,
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: 0,
        lineHeight: 1
      }}>
        Let's build
      </h1>

      {/* 项目选择器 */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 px-5 py-2.5 border transition-colors"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border)',
            borderRadius: 20,
            color: 'var(--text-secondary)',
            fontSize: 14,
            boxShadow: 'var(--shadow-card)',
            minWidth: 160
          }}
        >
          <FolderOpen size={15} style={{ color: 'var(--text-muted)' }} />
          <span className="flex-1 text-left truncate">{current ? current.name : t('welcome.defaultProject')}</span>
          <ChevronDown size={14} style={{
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s'
          }} />
        </button>

        {open && (
          <div className="absolute left-0 top-12 z-20 w-full border overflow-hidden"
            style={{
              background: 'var(--bg-dropdown)',
              borderColor: 'var(--border)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-dropdown)',
              minWidth: 200
            }}>
            <button
              onClick={() => { setActiveProject(null); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-[14px] text-left transition-colors"
              style={{ color: !activeProjectId ? '#26C6C0' : 'var(--text-primary)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sidebar-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <FolderOpen size={13} /> {t('welcome.defaultProject')}
            </button>
            {projects.map(p => (
              <button key={p.id}
                onClick={() => { setActiveProject(p.id); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[14px] text-left transition-colors"
                style={{ color: p.id === activeProjectId ? '#26C6C0' : 'var(--text-primary)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sidebar-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <FolderOpen size={13} />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
            <div className="border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={handleAddProject}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[14px] text-left transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-sidebar-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <Plus size={13} /> {t('sidebar.addProject')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

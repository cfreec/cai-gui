import { useState, useRef, useEffect } from 'react'
import { X, Settings, User, BarChart2, Zap, Info, SlidersHorizontal } from 'lucide-react'
import AccountSettings from './settings/AccountSettings'
import ModelSettings from './settings/ModelSettings'
import GeneralSettings from './settings/GeneralSettings'
import { useT } from '../lib/i18n'

const TABS = [
  { id: 'general', tkey: 'nav.general', icon: SlidersHorizontal },
  { id: 'account', tkey: 'nav.account', icon: User },
  { id: 'models', tkey: 'nav.models', icon: Settings },
  { id: 'usage', tkey: 'nav.usage', icon: BarChart2 },
  { id: 'skills', tkey: 'nav.skills', icon: Zap },
  { id: 'about', tkey: 'nav.about', icon: Info },
] as const

interface Props { open: boolean; onClose: () => void }

export default function SettingsDialog({ open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState('general')
  const dialogRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dialogSize, setDialogSize] = useState({ w: 0, h: 0 })
  const t = useT()

  // 弹窗填充容器（留边距），随窗口缩放；上限 1400x1000
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = Math.min(e.contentRect.width - 80, 1300)
        const h = Math.min(e.contentRect.height - 80, 900)
        setDialogSize({ w, h })
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [open])

  if (!open) return null

  function handleBackdrop(e: React.MouseEvent) {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) onClose()
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.3)'
      }}
      onMouseDown={handleBackdrop}
    >
      <div
        ref={dialogRef}
        className="flex overflow-hidden"
        style={{
          width: dialogSize.w || '90%',
          height: dialogSize.h || '90%',
          background: 'var(--bg-app)',
          borderRadius: 16,
          boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
          border: '1px solid var(--border-card)'
        }}
      >
        {/* 左侧导航 */}
        <div className="flex flex-col flex-shrink-0 border-r"
          style={{ width: 220, background: 'var(--bg-app)', borderColor: 'var(--border-light)' }}>
          <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t('settings.title')}</h2>
          </div>
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors relative"
                  style={{
                    fontSize: 13,
                    background: isActive ? 'var(--bg-segment)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: isActive ? 600 : 400,
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-sidebar-hover)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                      style={{ width: 3, height: 20, background: 'var(--text-primary)' }} />
                  )}
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  {t(tab.tkey)}
                </button>
              )
            })}
          </nav>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-8 py-5 border-b flex-shrink-0"
            style={{ borderColor: 'var(--border-light)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {(() => { const tab = TABS.find(x => x.id === activeTab); return tab ? t(tab.tkey) : '' })()}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-sidebar-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'account' && <AccountSettings />}
            {activeTab === 'models' && <ModelSettings />}
            {activeTab === 'usage' && <PlaceholderPage title={t('placeholder.usage.title')} desc={t('placeholder.usage.desc')} />}
            {activeTab === 'skills' && <PlaceholderPage title={t('placeholder.skills.title')} desc={t('placeholder.skills.desc')} />}
            {activeTab === 'about' && <PlaceholderPage title={t('placeholder.about.title')} desc={t('placeholder.about.desc')} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlaceholderPage({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-2">
      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{title}</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</p>
    </div>
  )
}

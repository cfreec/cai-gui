import { useAppStore } from '../../store'
import { ChevronDown, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useT } from '../../lib/i18n'
import { SANS_FONT_OPTIONS, MONO_FONT_OPTIONS } from '../../lib/fonts'

export default function GeneralSettings() {
  const { settings, updateSettings } = useAppStore()
  const t = useT()

  const LANGUAGES = [
    { value: 'auto', label: t('lang.auto') },
    { value: 'zh', label: t('lang.zh') },
    { value: 'en', label: t('lang.en') },
  ]

  const THEMES = [
    { value: 'light', label: t('general.theme.light'), icon: '☀' },
    { value: 'dark', label: t('general.theme.dark'), icon: '🌙' },
    { value: 'system', label: t('general.theme.system'), icon: '🖥' },
  ]

  const themeValue = settings.theme ?? 'light'
  const language = settings.language ?? 'auto'
  const sansSize = settings.sansSize ?? 13
  const sansFont = settings.sansFont ?? '系统默认'
  const codeSize = settings.codeSize ?? 12
  const codeFont = settings.codeFont ?? 'SF Mono / ui-monospace'

  function handleTheme(v: string) {
    updateSettings({ theme: v as 'light' | 'dark' | 'system' })
  }

  // 语言状态说明文字
  const langStatus = language === 'auto'
    ? t('general.language.auto')
    : language === 'zh'
      ? t('general.language.zh')
      : t('general.language.en')
  const langDesc = <>{t('general.language.desc1')}<br />{langStatus}</>

  return (
    <div className="space-y-5">
      <p style={{ fontSize: 12, color: 'var(--text-desc)', margin: 0 }}>
        {t('general.subtitle')}
      </p>

      {/* 语言卡片 */}
      <SettingCard>
        <SettingRow label={t('general.language')} desc={langDesc}>
          <SelectDropdown
            options={LANGUAGES}
            value={language}
            onChange={v => updateSettings({ language: v as 'auto' | 'zh' | 'en' })}
            width={180}
          />
        </SettingRow>
      </SettingCard>

      {/* 外观分组标题 */}
      <SectionTitle title={t('general.appearance')} desc={t('general.appearance.desc')} />

      {/* 主题卡片 */}
      <SettingCard>
        <SettingRow label={t('general.theme')} desc={t('general.theme.desc')}>
          <div className="flex rounded-lg p-1 flex-shrink-0" style={{ background: 'var(--bg-segment)' }}>
            {THEMES.map(th => (
              <button
                key={th.value}
                onClick={() => handleTheme(th.value)}
                className="flex items-center gap-1 rounded-md transition-all"
                style={{
                  padding: '6px 10px',
                  fontSize: 13,
                  background: themeValue === th.value ? 'var(--bg-card)' : 'transparent',
                  color: themeValue === th.value ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: themeValue === th.value ? 500 : 400,
                  boxShadow: themeValue === th.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: themeValue === th.value ? '1px solid var(--border)' : '1px solid transparent',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ fontSize: 13 }}>{th.icon}</span>
                {th.label}
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingCard>

      {/* 无衬线字体卡片 */}
      <SettingCard>
        <SettingRow label={t('general.sansFont')} desc={t('general.sansFont.desc')}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <NumberInput value={sansSize} min={8} max={20} onChange={v => updateSettings({ sansSize: v })} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>px</span>
              <SelectDropdown
                options={SANS_FONT_OPTIONS.map(f => ({ value: f, label: f }))}
                value={sansFont}
                onChange={v => updateSettings({ sansFont: v })}
                width={240}
              />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: 0 }}>{t('general.sansFont.hint')}</p>
          </div>
        </SettingRow>
      </SettingCard>

      {/* 代码字体卡片 */}
      <SettingCard>
        <SettingRow label={t('general.codeFont')} desc={t('general.codeFont.desc')}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <NumberInput value={codeSize} min={8} max={20} onChange={v => updateSettings({ codeSize: v })} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>px</span>
              <SelectDropdown
                options={MONO_FONT_OPTIONS.map(f => ({ value: f, label: f }))}
                value={codeFont}
                onChange={v => updateSettings({ codeFont: v })}
                width={260}
              />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: 0 }}>{t('general.codeFont.hint')}</p>
          </div>
        </SettingRow>
      </SettingCard>
    </div>
  )
}

function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="pt-1">
      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h4>
      <p style={{ fontSize: 12, color: 'var(--text-desc)', marginTop: 2 }}>{desc}</p>
    </div>
  )
}

function SettingCard({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="border rounded-xl" style={{
        borderColor: 'var(--border-card)',
        background: 'var(--bg-app)',
        padding: '14px 20px'
      }}>
        {children}
      </div>
      {hint && <p style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 6, paddingLeft: 4 }}>{hint}</p>}
    </div>
  )
}

// 宽度足够时左右两列，不够时上下堆叠
function SettingRow({ label, desc, children }: {
  label: string; desc: React.ReactNode; children: React.ReactNode
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [stacked, setStacked] = useState(false)

  useEffect(() => {
    if (!rowRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setStacked(e.contentRect.width < 480)
      }
    })
    ro.observe(rowRef.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={rowRef}
      style={{
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: stacked ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: stacked ? 10 : 16
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 12, color: 'var(--text-desc)', marginTop: 2, lineHeight: 1.5 }}>{desc}</p>
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', width: stacked ? '100%' : undefined }}>
        {children}
      </div>
    </div>
  )
}

function NumberInput({ value, min, max, onChange }: {
  value: number; min: number; max: number; onChange: (v: number) => void
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={e => {
        const v = parseInt(e.target.value)
        if (!isNaN(v) && v >= min && v <= max) onChange(v)
      }}
      style={{
        width: 84, height: 46, textAlign: 'center',
        fontSize: 16, outline: 'none',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-app)',
        color: 'var(--text-primary)'
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'var(--border-focus)'}
      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
    />
  )
}

function SelectDropdown({ options, value, onChange, width }: {
  options: { value: string; label: string }[]
  value: string; onChange: (v: string) => void; width: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find(o => o.value === value)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 6, width, height: 38, padding: '0 12px',
          fontSize: 13, cursor: 'pointer',
          border: `1px solid ${open ? 'var(--border-focus)' : 'var(--border)'}`,
          borderRadius: 8,
          background: 'var(--bg-app)',
          color: 'var(--text-primary)'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current?.label}
        </span>
        <ChevronDown size={13} style={{
          color: 'var(--text-muted)', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.15s'
        }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 42, left: 0, zIndex: 30,
          width: Math.max(width, 160),
          background: 'var(--bg-dropdown)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: 'var(--shadow-dropdown)',
          overflow: 'hidden'
        }}>
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '9px 12px',
                fontSize: 13, textAlign: 'left', cursor: 'pointer',
                color: o.value === value ? '#26C6C0' : 'var(--text-primary)',
                background: o.value === value ? 'rgba(38,198,192,0.06)' : 'transparent',
                border: 'none'
              }}
              onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = 'var(--bg-sidebar-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = o.value === value ? 'rgba(38,198,192,0.06)' : 'transparent' }}
            >
              {o.label}
              {o.value === value && <Check size={13} style={{ color: '#26C6C0', flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

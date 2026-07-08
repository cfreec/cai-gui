import { useState } from 'react'
import { useAppStore } from '../../store'
import { Eye, EyeOff } from 'lucide-react'
import { useT } from '../../lib/i18n'

export default function AccountSettings() {
  const { settings, updateSettings } = useAppStore()
  const [showKey, setShowKey] = useState(false)
  const t = useT()

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('account.apiKey')}</label>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
          style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}
        >
          <input
            type={showKey ? 'text' : 'password'}
            value={settings.apiKey}
            onChange={e => updateSettings({ apiKey: e.target.value })}
            placeholder={t('account.apiKeyPlaceholder')}
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <button onClick={() => setShowKey(v => !v)} style={{ color: 'var(--text-muted)' }}>
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{t('account.baseUrl')}</label>
        <input
          type="text"
          value={settings.baseUrl}
          onChange={e => updateSettings({ baseUrl: e.target.value })}
          placeholder={t('account.baseUrlPlaceholder')}
          className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none transition-colors"
          style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('account.urlHint')}</p>
      </div>
    </div>
  )
}

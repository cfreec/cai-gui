import { useState } from 'react'
import { useAppStore, ModelConfig } from '../../store'
import { Plus, Trash2, RefreshCw, Check } from 'lucide-react'
import { useT } from '../../lib/i18n'

export default function ModelSettings() {
  const { settings, updateSettings } = useAppStore()
  const [models, setModels] = useState<ModelConfig[]>(settings.models)
  const [fetching, setFetching] = useState(false)
  const [fetchedModels, setFetchedModels] = useState<Array<{ id: string; contextWindow?: number }>>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showDropdown, setShowDropdown] = useState(false)
  const t = useT()

  function save(updated: ModelConfig[]) {
    setModels(updated)
    updateSettings({ models: updated })
  }

  function addRow() {
    save([...models, { group: 'default', displayName: '', modelId: '' }])
  }

  function removeRow(i: number) {
    save(models.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, field: keyof ModelConfig, value: string) {
    const updated = models.map((m, idx) => idx === i ? { ...m, [field]: value } : m)
    save(updated)
  }

  async function fetchModels() {
    if (!settings.apiKey) return alert(t('alert.noApiKey'))
    setFetching(true)
    setShowDropdown(false)
    try {
      const ids = await window.api.listModels({
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl || undefined
      })
      setFetchedModels(ids)
      setSelected(new Set())
      setShowDropdown(true)
    } catch (e) {
      alert(t('alert.fetchFailed') + (e as Error).message)
    } finally {
      setFetching(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function applySelected() {
    const toAdd: ModelConfig[] = Array.from(selected)
      .filter((id) => !models.some((m) => m.modelId === id))
      .map((id) => {
        const modelData = fetchedModels.find(m => m.id === id)
        return {
          group: 'default',
          displayName: id,
          modelId: id,
          contextWindow: modelData?.contextWindow
        }
      })
    save([...models, ...toAdd])
    setShowDropdown(false)
    setSelected(new Set())
  }

  return (
    <div className="space-y-4">
      {/* 表头 */}
      <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 px-1">
        {['group', 'display', 'call', ''].map((h) => (
          <span key={h} className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{t(`model.${h}` as any)}</span>
        ))}
      </div>

      {/* 模型行 */}
      <div className="space-y-1.5">
        {models.map((m, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-center">
            {(['group', 'displayName', 'modelId'] as const).map((field) => (
              <input
                key={field}
                value={m[field]}
                onChange={(e) => updateRow(i, field, e.target.value)}
                placeholder={field === 'group' ? t('model.groupPlaceholder') : ''}
                className="px-2 py-1.5 rounded border text-[12px] outline-none transition-colors"
                style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            ))}
            <button
              onClick={() => removeRow(i)}
              className="p-1.5 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors border"
          style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-sidebar-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-app)')}
        >
          <Plus size={13} />
          {t('model.add')}
        </button>

        <div className="relative">
          <button
            onClick={fetchModels}
            disabled={fetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors border disabled:opacity-50"
            style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-sidebar-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-app)')}
          >
            <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
            {t('model.fetch')}
          </button>

          {/* 模型下拉列表 */}
          {showDropdown && fetchedModels.length > 0 && (
            <div className="absolute left-0 top-8 z-10 w-72 max-h-60 overflow-y-auto rounded-lg border shadow-xl"
              style={{ background: 'var(--bg-dropdown)', borderColor: 'var(--border)' }}>
              <div className="p-2 space-y-0.5">
                {fetchedModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => toggleSelect(model.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-sidebar-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0`}
                      style={{ background: selected.has(model.id) ? '#0d9488' : 'transparent', borderColor: selected.has(model.id) ? '#0d9488' : 'var(--border)' }}>
                      {selected.has(model.id) && <Check size={10} className="text-white" />}
                    </span>
                    <span className="truncate">{model.id}</span>
                  </button>
                ))}
              </div>
              {selected.size > 0 && (
                <div className="sticky bottom-0 p-2 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-dropdown)' }}>
                  <button
                    onClick={applySelected}
                    className="w-full py-1.5 rounded-lg text-white text-[12px] font-medium transition-colors"
                    style={{ background: '#0d9488' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#0f766e')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#0d9488')}
                  >
                    {t('model.addCount').replace('{count}', selected.size.toString())}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

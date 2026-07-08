import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Paperclip, ChevronDown, Check, Square, Trash2, CornerDownRight } from 'lucide-react'
import { useAppStore, Message, Conversation } from '../store'
import { setActiveAssistant, respondPermission, clearListening } from '../lib/chatService'
import { useT } from '../lib/i18n'
import Tooltip from './Tooltip'
import ProseMirrorComposer, { ComposerHandle } from './ProseMirrorComposer'
import claudeIcon from '@lobehub/icons-static-svg/icons/claude-color.svg?url'
import claudeCodeIcon from '@lobehub/icons-static-svg/icons/claudecode-color.svg?url'
import codexIcon from '@lobehub/icons-static-svg/icons/codex.svg?url'
import deepseekIcon from '@lobehub/icons-static-svg/icons/deepseek-color.svg?url'
import geminiIcon from '@lobehub/icons-static-svg/icons/gemini-color.svg?url'
import llamaIcon from '@lobehub/icons-static-svg/icons/meta-color.svg?url'
import mistralIcon from '@lobehub/icons-static-svg/icons/mistral-color.svg?url'
import openaiIcon from '@lobehub/icons-static-svg/icons/openai.svg?url'
import qwenIcon from '@lobehub/icons-static-svg/icons/qwen-color.svg?url'

const THINKING_MODES = [
  { value: 'high', labelKey: 'thinking.default' },
  { value: 'low', labelKey: 'thinking.low' },
  { value: 'medium', labelKey: 'thinking.medium' },
  { value: 'xhigh', labelKey: 'thinking.xhigh' },
  { value: 'max', labelKey: 'thinking.max' }
]

const PERMISSION_MODES = [
  { value: 'auto', labelKey: 'permission.auto' },
  { value: 'ask', labelKey: 'permission.ask' },
  { value: 'accept', labelKey: 'permission.accept' },
  { value: 'plan', labelKey: 'permission.plan' },
  { value: 'bypass', labelKey: 'permission.bypass' }
]

type ModelBrand = {
  label: string
  color: string
  bg?: string
  iconSrc?: string
}

const MODEL_SELECT_LAYOUT = {
  panelWidth: 350,
  groupIconSize: 12,
  modelIconSize: 12,
  selectedModelIconSize: 12,
  groupIndentX: 5,
  modelListIndentX: 5,
  modelRowPaddingX: 5,
  modelRowPaddingY: 0,
  modelRowMinHeight: 32,
  iconTextGap: 5,
  groupIconTextGap: 5,
  groupFontSize: 12,
  modelFontSize: 12,
  fallbackIconYOffset: 5
}

function getModelBrand(...parts: Array<string | undefined>): ModelBrand {
  const text = parts.filter(Boolean).join(' ').toLowerCase()

  if (text.includes('claude code') || text.includes('claudecode')) {
    return { label: '*', color: '#f97316', iconSrc: claudeCodeIcon }
  }
  if (text.includes('claude') || text.includes('anthropic')) {
    return { label: '*', color: '#f97316', iconSrc: claudeIcon }
  }
  if (text.includes('openai') || text.includes('gpt') || text.includes('codex')) {
    return { label: 'o', color: '#111827', iconSrc: openaiIcon }
  }
  if (text.includes('deepseek')) {
    return { label: 'D', color: '#2563eb', iconSrc: deepseekIcon }
  }
  if (text.includes('gemini') || text.includes('google')) {
    return { label: 'G', color: '#4285f4', iconSrc: geminiIcon }
  }
  if (text.includes('qwen') || text.includes('tongyi')) {
    return { label: 'Q', color: '#7c3aed', iconSrc: qwenIcon }
  }
  if (text.includes('llama') || text.includes('meta')) {
    return { label: 'L', color: '#0ea5e9', iconSrc: llamaIcon }
  }
  if (text.includes('mistral') || text.includes('mixtral')) {
    return { label: 'M', color: '#ea580c', iconSrc: mistralIcon }
  }

  return { label: 'M', color: 'var(--text-muted)', bg: 'var(--bg-sidebar-hover)' }
}

function ModelBrandIcon({ brand, size = 14 }: { brand: ModelBrand; size?: number }) {
  if (brand.iconSrc) {
    return (
      <img
        src={brand.iconSrc}
        alt=""
        className="block flex-shrink-0 object-contain"
        style={{ width: size, height: size, minWidth: size }}
      />
    )
  }

  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        minWidth: size,
        color: brand.color
      }}
    >
      <span
        className="block font-semibold"
        style={{
          fontSize: Math.max(9, Math.round(size * 0.72)),
          lineHeight: 1,
          transform: `translateY(${MODEL_SELECT_LAYOUT.fallbackIconYOffset}px)`
        }}
      >
        {brand.label}
      </span>
    </span>
  )
}

export default function ChatInput() {
  const t = useT()

  // 权限模式动态加提示
  const permissionModesWithHints = useMemo(() => PERMISSION_MODES.map(m => ({
    ...m,
    label: t(m.labelKey as any),
    hint: t(`permission.${m.value}.hint` as any)
  })), [t])

  const {
    settings, activeConversationId, conversations,
    addConversation, updateConversation, setActiveConversation,
    activeProjectId, projects, thinkingMode, setThinkingMode,
    permissionMode, setPermissionMode, selectedModel, setSelectedModel,
    loadingConv, setLoadingConv,
    queue, addQueueMessage, removeQueueMessage
  } = useAppStore()

  const [draftText, setDraftText] = useState('')
  const [hasInput, setHasInput] = useState(false)
  const composerRef = useRef<ComposerHandle>(null)
  const loading = loadingConv !== null && loadingConv === activeConversationId

  const groupedModels = useMemo(() => {
    const map = new Map<string, typeof settings.models>()
    for (const m of settings.models) {
      const g = m.group || 'default'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(m)
    }
    return map
  }, [settings.models])

  async function handleAttach() {
    // 使用隐藏文件选择器，将附件名称插入当前输入内容。
    const el = document.createElement('input')
    el.type = 'file'
    el.multiple = true
    el.onchange = () => {
      const files = Array.from(el.files ?? [])
      if (files.length) {
        const names = files.map(f => f.name).join(', ')
        composerRef.current?.insertPlainText(`[附件: ${names}]`)
      }
    }
    el.click()
  }

  // 核心发送逻辑：创建消息、设置 loading，并调用 IPC。
  async function doSend(text: string): Promise<void> {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      blocks: [{ type: 'text', text }],
      createdAt: Date.now()
    }

    let convId = activeConversationId
    if (!convId) {
      const newConv: Conversation = {
        id: crypto.randomUUID(),
        title: text.slice(0, 40),
        projectId: activeProjectId ?? 'default',
        messages: [userMsg],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      addConversation(newConv)
      setActiveConversation(newConv.id)
      convId = newConv.id
    } else {
      const conv = conversations.find(c => c.id === convId)!
      updateConversation(convId, {
        messages: [...conv.messages, userMsg],
        title: conv.messages.length === 0 ? text.slice(0, 40) : conv.title
      })
    }

    // 新建 assistant 消息，注册为当前接收目标。
    const assistantId = crypto.randomUUID()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', blocks: [], createdAt: Date.now() }
    const conv0 = useAppStore.getState().conversations.find(c => c.id === convId)!
    updateConversation(convId, { messages: [...conv0.messages, assistantMsg] })
    setActiveAssistant(convId, assistantId)
    setLoadingConv(convId)

    // 工作目录：选中项目则使用项目路径。
    const project = projects.find(p => p.id === activeProjectId)

    await window.api.chat.send({
      convId,
      prompt: text,
      model: selectedModel,
      permissionMode,
      thinkingMode,
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl || undefined,
      projectPath: project?.path
    })
  }

  async function handleSend(nextDraftText?: string) {
    const text = (nextDraftText ?? draftText).trim()
    if (!text) return

    if (loading) {
      // 正在回复时，将新消息加入队列。
      addQueueMessage(text)
      composerRef.current?.reset()
      return
    }

    await doSend(text)
    composerRef.current?.reset()
  }

  function handleStop() {
    if (loadingConv) {
      window.api.chat.abort(loadingConv)
      clearListening()
      setLoadingConv(null)
      // abort 不清空队列
    }
  }

  // Steer：立即发送队列中的一条
  async function handleSteer(index: number) {
    const text = queue[index]
    if (!text) return
    removeQueueMessage(index)
    await doSend(text)
  }

  // 删除队列中的某条
  function handleDelete(index: number) {
    removeQueueMessage(index)
  }

  // 按钮状态：loading 且输入为空时显示停止，否则显示发送。
  const showStopButton = loading && !hasInput

  return (
    <div className="px-4 pb-1 pt-4 relative flex-shrink-0">
        {/* 队列面板比输入框左右各缩进，底部压在输入框上边框。 */}
        {queue.length > 0 && (
          <div
            className="border transition-colors mx-3"
            style={{
              background: 'var(--bg-input)',
              borderColor: 'var(--border)',
              borderRadius: '0.75rem 0.75rem 0 0',
              borderBottom: 'none',
              marginBottom: '-1px',
              overflow: 'visible',
              position: 'relative',
              zIndex: 0
            }}
          >
            {queue.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-[13px] px-4"
                style={{
                  borderBottom: index < queue.length - 1 ? '1px solid var(--border)' : 'none',
                  minHeight: 44
                }}
              >
                <CornerDownRight size={14} className="flex-shrink-0" style={{ color: '#adb1b7' }} />
                <span className="flex-shrink-0 font-medium" style={{ color: 'var(--text-primary)' }}>
                  {index + 1}
                </span>
                <span
                  className="flex-1 truncate"
                  style={{ color: 'var(--text-primary)' }}
                  title={item}
                >
                  {item}
                </span>
                <Tooltip label={t('input.queueSend')}>
                  <button
                    onClick={() => handleSteer(index)}
                    className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[12px] transition-colors"
                    style={{ color: '#adb1b7' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#adb1b7' }}
                  >
                    <CornerDownRight size={13} />
                    <span>Steer</span>
                  </button>
                </Tooltip>
                <Tooltip label={t('input.queueDelete')}>
                  <button
                    onClick={() => handleDelete(index)}
                    className="flex-shrink-0 p-0.5 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>
        )}

        {/* 输入框始终保持完整圆角，层级高于队列框使上边框可见。 */}
        <div
          className="border transition-colors"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--border)',
            borderRadius: '1rem',
            position: 'relative',
            zIndex: 1
          }}
        >
          <ProseMirrorComposer
            ref={composerRef}
            onChange={(markdown, hasContent) => {
              setDraftText(markdown)
              setHasInput(hasContent)
            }}
            onSend={handleSend}
            placeholder={loading ? t('input.replyingPlaceholder') : t('input.placeholder')}
          />

          {/* 工具栏 */}
          <div className="flex items-center gap-1 px-3 pb-3 relative">
            {/* 附件 */}
            <Tooltip label={t('input.attachHint')}>
              <button
                onClick={handleAttach}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <Paperclip size={14} />
              </button>
            </Tooltip>

            {/* 模型选择 */}
            <ModelSelect groupedModels={groupedModels} value={selectedModel} onChange={setSelectedModel} t={t} />

            {/* 推理强度 */}
            <LabeledSelect label={t('input.thinkingLabel') as any} options={THINKING_MODES.map(m => ({ ...m, label: t(m.labelKey as any) }))} value={thinkingMode} onChange={setThinkingMode} t={t} tooltipKey="input.thinkingHint" />

            {/* 上下文窗口指示器 */}
            <ContextIndicator t={t} />

            <div className="flex-1" />

            {/* 权限模式靠右，发送按钮在最右侧。 */}
            <LabeledSelect label={t('input.permission') as any} options={permissionModesWithHints} value={permissionMode} onChange={setPermissionMode} t={t} tooltipKey="input.permissionHint" hideLabel alignRight />

            {/* 发送 / 停止 */}
            {showStopButton ? (
              <button
                onClick={handleStop}
                className="ml-1 flex items-center justify-center transition-colors"
                style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e5e5', flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#d4d4d4')}
                onMouseLeave={e => (e.currentTarget.style.background = '#e5e5e5')}
                title={t('stop')}
              >
                <Square size={13} className="text-[#555]" fill="#555" />
              </button>
            ) : (
              <Tooltip label={t('input.sendHint')}>
                <button
                  onClick={() => handleSend()}
                  disabled={!hasInput}
                  className="ml-1 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ width: 36, height: 36, borderRadius: '50%', background: '#2fbf8a', flexShrink: 0 }}
                  onMouseEnter={e => { if (hasInput) e.currentTarget.style.background = '#26a874' }}
                  onMouseLeave={e => (e.currentTarget.style.background = '#2fbf8a')}
                >
                  <Send size={14} className="text-white" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
        <p className="text-[11px] text-center mt-1.5" style={{ color: 'var(--text-muted)' }}>
          {t('input.keyHint')} · {t('input.shiftHint')}
        </p>
      </div>
    )
}

function ModelSelect({ groupedModels, value, onChange, t }: {
  groupedModels: Map<string, { group: string; displayName: string; modelId: string }[]>
  value: string
  onChange: (v: string) => void
  t: (key: any) => string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = [...groupedModels.values()].flat().find(m => m.modelId === value)
  const currentBrand = getModelBrand(current?.group, current?.displayName, current?.modelId ?? value)
  const entries = Array.from(groupedModels.entries())

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Tooltip label={t('input.modelHint')}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px]"
          style={{ color: 'var(--text-secondary)', background: open ? '#e9f8f1' : '#fafbfb' }}
          onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--bg-sidebar-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = open ? '#e9f8f1' : '#fafbfb' }}
        >
          <ModelBrandIcon brand={currentBrand} size={MODEL_SELECT_LAYOUT.selectedModelIconSize} />
          <span className="truncate font-semibold" style={{ maxWidth: '200px', fontSize: 11 }}>{current?.displayName ?? value}</span>
          <ChevronDown
            size={11}
            style={{
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.16s ease'
            }}
          />
        </button>
      </Tooltip>
      {open && (
        <div
          className="absolute bottom-9 left-0 z-50 max-w-[calc(100vw-48px)] rounded-xl border overflow-hidden py-2"
          style={{
            width: MODEL_SELECT_LAYOUT.panelWidth,
            background: 'var(--bg-dropdown)',
            borderColor: 'var(--border)',
            boxShadow: '0 18px 48px rgba(15, 23, 42, 0.16)'
          }}
        >
          <div className="px-3 pb-1.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>{t('input.modelHint')}</div>
          {entries.map(([group, models], groupIndex) => {
            const groupBrand = getModelBrand(group, models[0]?.displayName, models[0]?.modelId)

            return (
            <div
              key={group}
              className={groupIndex > 0 ? 'border-t pt-1.5 mt-1.5' : ''}
              style={{ borderColor: 'var(--border)' }}
            >
              <div
                className="flex items-center pb-0.5"
                style={{
                  gap: MODEL_SELECT_LAYOUT.groupIconTextGap,
                  paddingLeft: MODEL_SELECT_LAYOUT.groupIndentX,
                  paddingRight: MODEL_SELECT_LAYOUT.groupIndentX,
                  fontSize: MODEL_SELECT_LAYOUT.groupFontSize,
                  color: 'var(--text-muted)'
                }}
              >
                <ModelBrandIcon brand={groupBrand} size={MODEL_SELECT_LAYOUT.groupIconSize} />
                <span className="truncate">{group || t('model.group.default')}</span>
              </div>
              <div style={{ paddingLeft: MODEL_SELECT_LAYOUT.modelListIndentX }}>
                {models.map(m => {
                  const modelBrand = getModelBrand(m.group, m.displayName, m.modelId)

                  return (
                    <button
                      key={m.modelId}
                      onClick={() => { onChange(m.modelId); setOpen(false) }}
                      className="w-full flex items-center justify-between text-left transition-colors"
                      style={{
                        gap: MODEL_SELECT_LAYOUT.iconTextGap,
                        paddingLeft: MODEL_SELECT_LAYOUT.modelRowPaddingX,
                        paddingRight: MODEL_SELECT_LAYOUT.modelRowPaddingX,
                        paddingTop: MODEL_SELECT_LAYOUT.modelRowPaddingY,
                        paddingBottom: MODEL_SELECT_LAYOUT.modelRowPaddingY,
                        minHeight: MODEL_SELECT_LAYOUT.modelRowMinHeight,
                        fontSize: MODEL_SELECT_LAYOUT.modelFontSize,
                        color: m.modelId === value ? '#10b981' : 'var(--text-primary)',
                        background: m.modelId === value ? '#e9f8f1' : 'transparent',
                        borderRadius: 8
                      }}
                      onMouseEnter={e => { if (m.modelId !== value) e.currentTarget.style.background = 'var(--bg-sidebar-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = m.modelId === value ? '#e9f8f1' : 'transparent' }}
                    >
                      <span className="flex min-w-0 items-center" style={{ gap: MODEL_SELECT_LAYOUT.iconTextGap }}>
                        <ModelBrandIcon brand={modelBrand} size={MODEL_SELECT_LAYOUT.modelIconSize} />
                        <span className="truncate">{m.displayName}</span>
                      </span>
                      {m.modelId === value && <Check size={14} className="flex-shrink-0" style={{ color: '#10b981' }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

function LabeledSelect({ label, options, value, onChange, t, tooltipKey, hideLabel, alignRight }: {
  label: string
  options: { value: string; label: string; hint?: string }[]
  value: string
  onChange: (v: string) => void
  t: (key: any) => string
  tooltipKey?: string
  hideLabel?: boolean
  alignRight?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [hoveredOption, setHoveredOption] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find(o => o.value === value)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const button = (
    <button
      onClick={() => setOpen(v => !v)}
      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[12px] transition-colors"
      style={{ color: 'var(--text-secondary)', background: '#fafbfb' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-sidebar-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = '#fafbfb')}
    >
      <span>{current?.label ?? value}</span>
      <ChevronDown size={11} />
    </button>
  )

  return (
    <div className="relative" ref={ref}>
      {tooltipKey ? (
        <Tooltip label={t(tooltipKey)}>
          {button}
        </Tooltip>
      ) : button}
      {open && (
        <div
          className={`absolute bottom-9 z-50 rounded-xl border overflow-visible min-w-[200px] ${alignRight ? 'right-0' : 'left-0'}`}
          style={{ background: 'var(--bg-dropdown)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
        >
          {!hideLabel && <div className="px-3 pt-2 pb-1 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{label}</div>}
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              onMouseEnter={() => setHoveredOption(o.value)}
              onMouseLeave={() => setHoveredOption(null)}
              className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-left transition-colors relative"
              style={{ color: o.value === value ? '#0d9488' : 'var(--text-primary)', background: o.value === value ? '#eaf8f3' : 'transparent' }}
            >
              {/* 悬停时显示该选项的提示 */}
              {hoveredOption === o.value && o.hint && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 right-full mr-3 whitespace-nowrap text-[12px] px-3 py-1.5 rounded-lg border"
                  style={{
                    color: 'var(--text-muted)',
                    background: 'var(--bg-dropdown)',
                    borderColor: 'var(--border)',
                    boxShadow: 'var(--shadow-md)'
                  }}
                >
                  {o.hint}
                </div>
              )}
              {o.label}
              {o.value === value && <Check size={13} style={{ color: '#0d9488' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ContextIndicator({ t }: { t: (key: any) => string }) {
  const activeConversationId = useAppStore(s => s.activeConversationId)
  const conversations = useAppStore(s => s.conversations)
  const selectedModel = useAppStore(s => s.selectedModel)
  const settings = useAppStore(s => s.settings)
  const [hovered, setHovered] = useState(false)

  // 获取当前对话 usage。
  const conv = conversations.find(c => c.id === activeConversationId)
  const usage = conv?.usage ?? { inputTokens: 0, outputTokens: 0 }
  const usedTokens = usage.inputTokens + usage.outputTokens

  // 获取当前模型 context_window。
  const currentModel = settings.models.find(m => m.modelId === selectedModel)
  const totalTokens = currentModel?.contextWindow ?? 200000

  // 计算百分比（保留一位小数）
  const percent = totalTokens > 0 ? Math.round((usedTokens / totalTokens) * 1000) / 10 : 0
  const remaining = Math.round((100 - percent) * 10) / 10

  // SVG 圆形进度
  const radius = 8
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - percent / 100)

  // 格式化 token 数
  const formatTokens = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString()

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 圆形指示器 */}
      <div className="p-1.5">
        <svg width="20" height="20" className="transform -rotate-90">
          {/* 背景圆环 */}
          <circle
            cx="10"
            cy="10"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
          />
          {/* 进度圆环 */}
          <circle
            cx="10"
            cy="10"
            r={radius}
            fill="none"
            stroke="#0d9488"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* 悬停提示 */}
      {hovered && (
        <div
          className="absolute left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg border z-50 whitespace-nowrap"
          style={{
            bottom: 'calc(100% - 2px)',
            background: 'var(--bg-dropdown)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-md)',
            color: 'var(--text-primary)'
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="text-[13px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {t('input.contextWindow')}
          </div>
          <div className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {t('input.contextUsed').replace('{percent}', percent.toFixed(1)).replace('{remaining}', remaining.toFixed(1))}
          </div>
          <div className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {t('input.contextTokens').replace('{used}', formatTokens(usedTokens)).replace('{total}', formatTokens(totalTokens))}
          </div>
        </div>
      )}
    </div>
  )
}

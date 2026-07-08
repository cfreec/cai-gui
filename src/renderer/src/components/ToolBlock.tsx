import { useState, useEffect } from 'react'
import { ToolBlock as ToolBlockType } from '../store'
import { respondPermission } from '../lib/chatService'
import {
  Eye, FilePen, Terminal, Search, FileText, Wrench,
  ChevronRight, Copy, Check, X, Clock, Loader2
} from 'lucide-react'
import { useT } from '../lib/i18n'

// 工具名 → 图标 + i18n key
function toolMeta(name: string): { icon: typeof Eye; labelKey: string } {
  switch (name) {
    case 'Read': return { icon: Eye, labelKey: 'tool.read' }
    case 'Write': return { icon: FilePen, labelKey: 'tool.write' }
    case 'Edit': return { icon: FilePen, labelKey: 'tool.edit' }
    case 'Bash': return { icon: Terminal, labelKey: 'tool.bash' }
    case 'Grep': return { icon: Search, labelKey: 'tool.grep' }
    case 'Glob': return { icon: Search, labelKey: 'tool.glob' }
    default: return { icon: Wrench, labelKey: name }
  }
}

// 从入参提取一行摘要（路径 / 命令）
function summarize(name: string, input: Record<string, unknown>): string {
  if (input.file_path) return String(input.file_path)
  if (input.path) return String(input.path)
  if (input.command) return String(input.command)
  if (input.pattern) return String(input.pattern)
  return ''
}

interface Props {
  block: ToolBlockType
  convId: string
}

export default function ToolBlock({ block, convId }: Props) {
  const [expanded, setExpanded] = useState(block.status === 'pending')
  const [showRaw, setShowRaw] = useState(false)
  const t = useT()
  const { icon: Icon, labelKey } = toolMeta(block.name)
  const summary = summarize(block.name, block.input)
  const isPending = block.status === 'pending'
  const label = typeof labelKey === 'string' && labelKey.startsWith('tool.') ? t(labelKey as any) : labelKey

  // 权限请求到达时（status 从 running → pending）自动展开
  useEffect(() => {
    if (block.status === 'pending') setExpanded(true)
  }, [block.status])

  return (
    <div
      className="my-2 rounded-xl border overflow-hidden text-[13px]"
      style={{
        borderColor: isPending ? '#E8B07A' : 'var(--border)',
        borderLeftWidth: isPending ? 3 : 1,
        borderLeftColor: isPending ? '#D97757' : 'var(--border)',
        background: 'var(--bg-card)'
      }}
    >
      {/* 折叠头 */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors"
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-sidebar-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <ChevronRight
          size={14}
          style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        />
        <Icon size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
        {summary && (
          <span className="truncate font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>{summary}</span>
        )}
        <StatusBadge status={block.status} />
      </button>

      {expanded && <ToolBody block={block} convId={convId} showRaw={showRaw} setShowRaw={setShowRaw} />}
    </div>
  )
}

// 右侧状态徽章
function StatusBadge({ status }: { status: ToolBlockType['status'] }) {
  const t = useT()
  const base = 'ml-auto flex items-center gap-1 text-[11px] font-medium flex-shrink-0 px-1.5'
  switch (status) {
    case 'pending':
      return <span className={base} style={{ color: '#D97757' }}><Clock size={11} /> {t('tool.pending')}</span>
    case 'running':
    case 'approved':
      return <span className={base} style={{ color: 'var(--text-muted)' }}><Loader2 size={11} className="animate-spin" /> {t('tool.running')}</span>
    case 'completed':
      return <span className={base} style={{ color: '#1a9e8f' }}><Check size={12} /> {t('tool.completed')}</span>
    case 'rejected':
      return <span className={base} style={{ color: '#dc2626' }}><X size={12} /> {t('tool.rejected')}</span>
    case 'error':
      return <span className={base} style={{ color: '#dc2626' }}><X size={12} /> {t('tool.failed')}</span>
    default:
      return null
  }
}

interface BodyProps {
  block: ToolBlockType
  convId: string
  showRaw: boolean
  setShowRaw: (v: boolean) => void
}

function ToolBody({ block, convId, showRaw, setShowRaw }: BodyProps) {
  const [copied, setCopied] = useState(false)
  const [resultCopied, setResultCopied] = useState(false)
  const [showFullResult, setShowFullResult] = useState(false)
  const t = useT()
  const isPending = block.status === 'pending'
  const rawJson = JSON.stringify(block.input, null, 2)
  const resultText = block.result ?? ''
  const resultIsLong = resultText.length > 4000
  const visibleResult = resultIsLong && !showFullResult ? resultText.slice(0, 4000) : resultText

  function copyRaw() {
    navigator.clipboard.writeText(rawJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function copyResult() {
    navigator.clipboard.writeText(resultText)
    setResultCopied(true)
    setTimeout(() => setResultCopied(false), 1500)
  }

  return (
    <div className="border-t" style={{ borderColor: 'var(--border-light)' }}>
      {isPending && (
        <div className="px-3 py-2.5" style={{ background: '#FDF6F0' }}>
          <p className="text-[12px] m-0" style={{ color: '#B5651D' }}
            dangerouslySetInnerHTML={{ __html: t('tool.request').replace('{name}', block.name) }}
          />
        </div>
      )}

      {/* Raw Input 折叠区 */}
      <div className="px-3 py-2">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1 text-[12px]"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronRight size={12} style={{ transform: showRaw ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
          {t('tool.rawInput')}
        </button>
        {showRaw && (
          <div className="relative mt-1.5 rounded-lg overflow-hidden" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)' }}>
            <button
              onClick={copyRaw}
              className="absolute top-1.5 right-1.5 flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? t('tool.copied') : t('tool.copy')}
            </button>
            <pre className="p-2.5 m-0 text-[12px] font-mono overflow-x-auto" style={{ color: 'var(--text-secondary)' }}>{rawJson}</pre>
          </div>
        )}
      </div>

      {/* 工具结果 */}
      {block.result && (
        <div className="px-3 pb-2">
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>{t('tool.result')}</span>
            <button
              onClick={copyResult}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-sidebar-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {resultCopied ? <Check size={11} /> : <Copy size={11} />} {resultCopied ? t('tool.copied') : t('tool.copy')}
            </button>
          </div>
          <pre
            className="p-2.5 m-0 text-[12px] font-mono rounded-lg overflow-x-auto whitespace-pre-wrap"
            style={{
              color: block.status === 'rejected' || block.status === 'error' ? '#dc2626' : 'var(--text-secondary)',
              background: 'var(--bg-app)', border: '1px solid var(--border-light)', maxHeight: showFullResult ? 520 : 240
            }}
          >{visibleResult}</pre>
          {resultIsLong && (
            <button
              onClick={() => setShowFullResult(v => !v)}
              className="mt-1.5 text-[11px] transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {showFullResult ? t('tool.collapseResult' as any) : t('tool.expandResult' as any)}
            </button>
          )}
        </div>
      )}

      {/* Approve / Reject 按钮（仅 pending） */}
      {isPending && (
        <div className="flex items-center justify-end gap-2 px-3 py-2.5 border-t" style={{ borderColor: 'var(--border-light)' }}>
          <button
            onClick={() => respondPermission(convId, block.permissionId!, false)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-sidebar-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {t('tool.reject')}
          </button>
          <button
            onClick={() => respondPermission(convId, block.permissionId!, true, block.input)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-white transition-colors"
            style={{ background: '#D97757' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#C56646')}
            onMouseLeave={e => (e.currentTarget.style.background = '#D97757')}
          >
            {t('tool.approve')}
          </button>
        </div>
      )}
    </div>
  )
}

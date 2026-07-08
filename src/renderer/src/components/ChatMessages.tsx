import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useAppStore, Conversation, Message } from '../store'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Copy, RotateCw, Check } from 'lucide-react'
import ToolBlock from './ToolBlock'
import { useT } from '../lib/i18n'
import Tooltip from './Tooltip'
import { setActiveAssistant } from '../lib/chatService'

interface Props {
  conversation: Conversation
}

export default function ChatMessages({ conversation }: Props) {
  const t = useT()
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadingConv = useAppStore((s) => s.loadingConv)
  const activeConversationId = useAppStore((s) => s.activeConversationId)
  const selectedModel = useAppStore((s) => s.selectedModel)

  const [showScrollButton, setShowScrollButton] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const scrollTimerRef = useRef<number | null>(null)

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const scrollDepth = el.scrollHeight - el.scrollTop - el.clientHeight
    const nearBottom = scrollDepth <= 5
    setAtBottom(nearBottom)
    setShowScrollButton(!nearBottom)
  }, [])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    el.addEventListener('scroll', () => {
      if (scrollTimerRef.current) cancelAnimationFrame(scrollTimerRef.current)
      scrollTimerRef.current = requestAnimationFrame(() => {
        // 等一帧确保 scrollTop 已更新
        setTimeout(checkScroll, 16)
      })
    }, { passive: true })
    // 初始检测
    const timer = setTimeout(() => requestAnimationFrame(checkScroll), 50)
    return () => {
      el.removeEventListener('scroll', () => {})
      clearTimeout(timer)
      if (scrollTimerRef.current) cancelAnimationFrame(scrollTimerRef.current)
    }
  }, [checkScroll, conversation.messages.length])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollButton(false)
  }

  // 计算是否需要显示"思考中"动画：仅在最后一条 assistant 消息 blocks 完全为空时（初始等待阶段）
  const showThinking = useMemo(() => {
    if (!loadingConv || loadingConv !== activeConversationId) return false
    if (conversation.messages.length === 0) return false
    const last = conversation.messages[conversation.messages.length - 1]
    return last.role === 'assistant' && last.blocks.length === 0
  }, [loadingConv, activeConversationId, conversation.messages, conversation.messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.messages])

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="space-y-4" style={{ maxWidth: 900, minWidth: 400, margin: '0 auto', width: '100%', padding: '16px 16px 4px' }}>
          {conversation.messages.map((msg, idx) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <UserMessage msg={msg} t={t} convId={conversation.id} />
              ) : (
                <AssistantMessage
                  msg={{ blocks: conversation.messages[idx].blocks, createdAt: conversation.messages[idx].createdAt }}
                  t={t}
                  convId={conversation.id}
                  isStreaming={idx === conversation.messages.length - 1 && loadingConv === activeConversationId}
                  selectedModel={selectedModel}
                />
              )}
            </div>
          ))}
          {showThinking && (
            <div className="flex justify-start">
              <div
                className="text-[13px] font-medium"
                style={{
                  background: 'linear-gradient(90deg, var(--text-primary) 25%, #26C6C0 45%, #ffffff 50%, #26C6C0 55%, var(--text-primary) 75%)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'shimmer 2s infinite linear',
                }}
              >
                {t('input.thinking')}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      {/* 向下滚动按钮 — absolute 定位在外层容器上，bottom 相对外层容器底部 */}
      {showScrollButton && (
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ bottom: '0px' }}>
          <button
            onClick={scrollToBottom}
            className="pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer"
            style={{
              background: '#ffffff',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f0f0f0'
              e.currentTarget.style.transform = 'scale(1.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.transform = 'scale(1)'
            }}
            aria-label={t('scroll.toBottom')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--text-primary)' }}>
              <path d="M10 3v11M6 11l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// AI 消息气泡：带始终可见的复制按钮
function AssistantMessage({ msg, t, convId, isStreaming, selectedModel }: {
  msg: Pick<Message, 'blocks' | 'createdAt'>
  t: (key: any) => string
  convId: string
  isStreaming: boolean
  selectedModel: string
}) {
  const hasContent = msg.blocks.some(b => b.type === 'tool' || (b.type === 'text' && b.text.trim()))

  if (!hasContent) return null

  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const text = msg.blocks.map(b => b.type === 'text' ? b.text : '').join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="max-w-[85%] w-full">
      <div className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
        {msg.blocks.map((b, i) =>
          b.type === 'text'
            ? <MarkdownText key={i} text={b.text} t={t} selectedModel={selectedModel} />
            : <ToolBlock key={b.toolId || i} block={b} convId={convId} />
        )}
      </div>
      {/* streaming 且无正在流入的文字时，在气泡内显示"思考中"（approve 后等待阶段）*/}
      {isStreaming && !msg.blocks.some(b => b.type === 'text' && b.text.trim()) && (
        <div
          className="text-[13px] font-medium mt-2"
          style={{
            background: 'linear-gradient(90deg, var(--text-primary) 25%, #26C6C0 45%, #ffffff 50%, #26C6C0 55%, var(--text-primary) 75%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'shimmer 2s infinite linear',
          }}
        >
          {t('input.thinking')}
        </div>
      )}
      {/* 底部操作栏 — 仅在非流式回复时显示，左对齐，与内容保持间距 */}
      {!isStreaming && (
        <div className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)', paddingLeft: '4px' }}>
          <Tooltip label={t('message.copy')}>
            <button
              onClick={handleCopy}
              className="p-0.5 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.background = 'var(--bg-sidebar-hover)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  )
}

// AI 文本块：Markdown + 代码高亮（亮色主题）
function MarkdownText({ text, t, selectedModel }: { text: string; t: (key: any) => string; selectedModel: string }) {
  if (!text) return null
  const isClaude = selectedModel.toLowerCase().includes('claude')
  return (
    <div className="prose prose-sm max-w-none leading-relaxed" style={{ color: 'var(--text-primary)' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            if (!match) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded text-[12px]"
                  style={{
                    background: isClaude ? '#f6e8e1' : 'var(--bg-segment)',
                    color: isClaude ? '#8e2727' : '#111111',
                    fontWeight: isClaude ? 500 : 700
                  }}
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} className={className}>{children}</CodeBlock>
          }
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

function CodeBlock({ language, value, className, children }: {
  language: string
  value: string
  className?: string
  children: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="ai-code-block group relative my-3 overflow-hidden rounded-lg border">
      <div className="flex h-8 items-center justify-between px-3">
        <span className="font-mono text-[11px] lowercase">{language}</span>
        <button
          onClick={copyCode}
          className="ai-code-copy inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="m-0 p-3 pt-2 text-[12px] leading-relaxed">
          <code className={className}>{children}</code>
        </pre>
      </div>
    </div>
  )
}

// 用户消息：带悬停操作栏
function UserMessage({ msg, t, convId }: { msg: Message; t: (key: any) => string; convId: string }) {
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const { settings, projects, activeProjectId, selectedModel, permissionMode, thinkingMode, setLoadingConv } = useAppStore()
  const { addConversation, updateConversation, conversations } = useAppStore()

  const handleCopy = () => {
    const text = msg.blocks.map(b => b.type === 'text' ? b.text : '').join('')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const handleRetry = async () => {
    const text = msg.blocks.map(b => b.type === 'text' ? b.text : '').join('')
    if (!text.trim()) return

    // 创建新的用户消息
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      blocks: [{ type: 'text', text }],
      createdAt: Date.now()
    }

    const conv = conversations.find(c => c.id === convId)!
    updateConversation(convId, {
      messages: [...conv.messages, userMsg],
      updatedAt: Date.now()
    })

    // 新建空 assistant 消息
    const assistantId = crypto.randomUUID()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', blocks: [], createdAt: Date.now() }
    const conv0 = useAppStore.getState().conversations.find(c => c.id === convId)!
    updateConversation(convId, { messages: [...conv0.messages, assistantMsg] })
    setActiveAssistant(convId, assistantId)
    setLoadingConv(convId)

    // 工作目录
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

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div
      className="relative"
      style={{ maxWidth: '75%' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="px-4 py-3 rounded-2xl text-[13px] whitespace-pre-wrap"
        style={{ background: '#ddf3ec', color: 'var(--text-primary)' }}
      >
        {msg.blocks.map((b, i) => (b.type === 'text' ? <span key={i}>{b.text}</span> : null))}
      </div>

      {/* 操作栏 — 绝对定位在气泡正下方，不撑大气泡背景 */}
      <div
        className="absolute -bottom-5 right-0 flex items-center gap-2 text-[11px] h-5 whitespace-nowrap"
        style={{ color: 'var(--text-muted)' }}
      >
        {hovered && (
          <>
            <span>{formatTime(msg.createdAt)}</span>
            <Tooltip label={t('message.retry')}>
              <button
                onClick={handleRetry}
                className="p-0.5 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--text-primary)'
                  e.currentTarget.style.background = 'var(--bg-sidebar-hover)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-muted)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <RotateCw size={13} />
              </button>
            </Tooltip>
            <Tooltip label={t('message.copy')}>
              <button
                onClick={handleCopy}
                className="p-0.5 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--text-primary)'
                  e.currentTarget.style.background = 'var(--bg-sidebar-hover)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-muted)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  )
}

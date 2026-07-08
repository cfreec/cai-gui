// 主进程：Claude Agent SDK 调用 + 权限授权回调
import { ipcMain, BrowserWindow, app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

// 权限模式映射：UI 值 → SDK permissionMode
const PERMISSION_MAP: Record<string, string> = {
  ask: 'default',
  accept: 'acceptEdits',
  plan: 'plan',
  bypass: 'bypassPermissions',
  auto: 'auto'
}

// 「询问权限」模式下强制走 canUseTool 的工具（含只读，对齐 Claude Code 桌面端行为）
const ASK_TOOLS = ['Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'NotebookEdit']

interface SendPayload {
  convId: string
  prompt: string
  model: string
  permissionMode: string
  thinkingMode: string   // low/medium/high/xhigh/max → SDK effort
  apiKey: string
  baseUrl?: string
  projectPath?: string  // 选中项目则传，否则用默认工作目录
}

// 待授权的 Promise：permissionId → resolve
const pendingPermissions = new Map<string, (result: unknown) => void>()
// 进行中的会话：convId → AbortController
const activeRuns = new Map<string, AbortController>()
// 进行中的 Query 实例：convId → Query 引用（用于调用 interrupt）
const activeQueries = new Map<string, { query: unknown; abort: AbortController }>()

let permissionSeq = 0

function defaultWorkspace(): string {
  const dir = join(app.getPath('userData'), 'workspaces', 'default')
  try { mkdirSync(dir, { recursive: true }) } catch { /* ignore */ }
  return dir
}

export function registerChatHandlers(): void {
  ipcMain.handle('chat:send', (e, payload: SendPayload) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) runQuery(win, payload)
    return true
  })

  ipcMain.handle('chat:abort', (_e, convId: string) => {
    // 第一层：立即 abort（触发 graceful shutdown，stdin EOF → kill）
    const abort = activeRuns.get(convId)
    if (abort) {
      abort.abort()
      activeRuns.delete(convId)
    }
    // 第二层：延迟调用 interrupt（如果 SDK 已初始化完成，立即切断子进程）
    // 延迟是为了等 SDK 初始化好内部状态，catch 兜底防止任何报错
    setTimeout(() => {
      try {
        const q = activeQueries.get(convId)
        if (q) {
          const qi = (q.query as { interrupt?: () => Promise<unknown> })?.interrupt
          if (qi) {
            qi().catch(() => { /* SDK 未初始化或已关闭，忽略 */ })
          }
        }
      } catch { /* 静默忽略 */ }
    }, 500)
    // 清理引用
    activeQueries.delete(convId)
    return true
  })

  ipcMain.handle('chat:permission-response', (_e, { permissionId, approved, input }:
    { permissionId: string; approved: boolean; input?: Record<string, unknown> }) => {
    const resolve = pendingPermissions.get(permissionId)
    if (!resolve) return false
    pendingPermissions.delete(permissionId)
    if (approved) resolve({ behavior: 'allow', updatedInput: input ?? {} })
    else resolve({ behavior: 'deny', message: 'User refused permission to run tool' })
    return true
  })
}

async function runQuery(win: BrowserWindow, p: SendPayload): Promise<void> {
  const send = (channel: string, data: unknown) => {
    if (!win.isDestroyed()) win.webContents.send(channel, data)
  }

  const abort = new AbortController()
  activeRuns.set(p.convId, abort)

  // canUseTool：把授权请求推给渲染层，挂起 Promise 等用户决定
  const canUseTool = (
    toolName: string,
    input: Record<string, unknown>,
    opts: { title?: string; decisionReason?: string }
  ) =>
    new Promise((resolve) => {
      const permissionId = `perm_${Date.now()}_${permissionSeq++}`
      pendingPermissions.set(permissionId, resolve as (r: unknown) => void)
      send('chat:permission', {
        convId: p.convId,
        permissionId,
        toolName,
        input,
        title: opts?.title,
        reason: opts?.decisionReason
      })
    })

  try {
    // 动态导入：Agent SDK 仅在主进程可用
    const { query } = await import('@anthropic-ai/claude-agent-sdk')
    const cwd = p.projectPath || defaultWorkspace()
    const sdkMode = PERMISSION_MAP[p.permissionMode] ?? 'default'

    const stream = query({
      prompt: p.prompt,
      options: {
        model: p.model,
        permissionMode: sdkMode,
        effort: p.thinkingMode,
        cwd,
        canUseTool,
        abortController: abort,
        includePartialMessages: true,
        systemPrompt: { type: 'preset', preset: 'claude_code' },
        settingSources: p.projectPath ? ['project'] : [],
        // 询问权限：强制所有工具（含只读）都弹授权；bypass：需显式开启
        ...(p.permissionMode === 'ask'
          ? { settings: { permissions: { ask: ASK_TOOLS } } }
          : {}),
        ...(sdkMode === 'bypassPermissions' ? { allowDangerouslySkipPermissions: true } : {}),
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: p.apiKey,
          ...(p.baseUrl ? { ANTHROPIC_BASE_URL: p.baseUrl } : {})
        }
      } as Record<string, unknown>
    })

    // 保存 Query 引用以便 interrupt
    activeQueries.set(p.convId, { query: stream, abort })

    let userAborted = false

    // 监听 abort signal，用户点停止时立即 break 循环
    const onAbort = () => {
      userAborted = true
    }
    abort.signal.addEventListener('abort', onAbort, { once: true })

    try {
      for await (const msg of stream) {
        // 每次收到消息前先检查是否已 abort
        if (abort.signal.aborted) break
        dispatchMessage(send, p.convId, msg)
      }
      if (!userAborted) {
        send('chat:done', { convId: p.convId })
      }
    } catch (err) {
      // SDK 内部因为 abort 产生的 error 忽略
      if (!abort.signal.aborted) {
        send('chat:error', { convId: p.convId, message: (err as Error).message })
      }
    } finally {
      abort.signal.removeEventListener('abort', onAbort)
      activeRuns.delete(p.convId)
    }
  } catch (err) {
    // 初始化阶段（import/query 构造）的异常
    if (!abort.signal.aborted) {
      send('chat:error', { convId: p.convId, message: (err as Error).message })
    }
    activeRuns.delete(p.convId)
  }
}

type Send = (channel: string, data: unknown) => void

// 把 SDK 消息流翻译成渲染层事件
function dispatchMessage(send: Send, convId: string, msg: Record<string, unknown>): void {
  const type = msg.type as string

  // 增量文本（token 级流式）
  if (type === 'stream_event') {
    const ev = msg.event as Record<string, unknown> | undefined
    const evType = ev?.type as string | undefined

    const delta = ev?.delta as Record<string, unknown> | undefined
    if (ev?.type === 'content_block_delta' && delta?.type === 'text_delta') {
      send('chat:delta', { convId, text: delta.text })
    }
    return
  }

  // 完整 assistant 消息：含文本块和 tool_use 块
  if (type === 'assistant') {
    const inner = (msg.message as Record<string, unknown>)?.content as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(inner)) return
    for (const block of inner) {
      if (block.type === 'tool_use') {
        send('chat:tool-use', {
          convId,
          toolId: block.id,
          name: block.name,
          input: block.input
        })
      }
    }
    return
  }

  // user 消息里携带 tool_result：回填到对应工具块
  if (type === 'user') {
    const inner = (msg.message as Record<string, unknown>)?.content as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(inner)) return
    for (const block of inner) {
      if (block.type === 'tool_result') {
        const c = block.content
        const text = typeof c === 'string'
          ? c
          : Array.isArray(c)
            ? c.map((x: Record<string, unknown>) => x.text ?? '').join('')
            : ''
        send('chat:tool-result', {
          convId,
          toolId: block.tool_use_id,
          result: text,
          isError: block.is_error === true
        })
      }
    }
    return
  }

  // 结束消息：含 cost / turns / usage
  if (type === 'result') {
    send('chat:result', {
      convId,
      subtype: msg.subtype,
      costUsd: msg.total_cost_usd,
      numTurns: msg.num_turns
    })

    // 提取 usage 信息
    const usage = msg.usage as Record<string, unknown> | undefined
    if (usage) {
      const usageData = {
        convId,
        inputTokens: (usage.input_tokens as number) ?? 0,
        outputTokens: (usage.output_tokens as number) ?? 0
      }
      send('chat:usage', usageData)
    }
  }
}

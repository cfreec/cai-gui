// 渲染层：注册 IPC 监听，把 Agent SDK 事件写进 store
import { useAppStore, Message, Block, ToolBlock } from '../store'

// convId → 当前正在接收的 assistant 消息 id
const activeAssistant = new Map<string, string>()
// 当前正在监听的 convId（用于 abort 时停止写入）
let activeListeningConvId: string | null = null

// 自动发送队列中下一条消息
async function tryAutoSendQueue(): Promise<void> {
  const store = useAppStore.getState()
  if (store.queue.length === 0) return

  const text = store.queue[0]
  // 从队列移除（即将发送）
  store.removeQueueMessage(0)

  let convId = store.activeConversationId
  if (!convId) return

  // 创建用户消息
  const userMsg: Message = {
    id: crypto.randomUUID(),
    role: 'user',
    blocks: [{ type: 'text', text }],
    createdAt: Date.now()
  }

  const conv = store.conversations.find(c => c.id === convId)
  if (!conv) return

  // 追加用户消息
  store.updateConversation(convId, {
    messages: [...conv.messages, userMsg],
    title: conv.messages.length === 0 ? text.slice(0, 40) : conv.title
  })

  // 新建空 assistant 消息
  const assistantId = crypto.randomUUID()
  const assistantMsg: Message = { id: assistantId, role: 'assistant', blocks: [], createdAt: Date.now() }
  const newState = useAppStore.getState()
  const conv0 = newState.conversations.find(c => c.id === convId)!
  store.updateConversation(convId, { messages: [...conv0.messages, assistantMsg] })
  setActiveAssistant(convId, assistantId)
  store.setLoadingConv(convId)

  // 调用 API
  const project = store.projects.find(p => p.id === store.activeProjectId)
  await window.api.chat.send({
    convId,
    prompt: text,
    model: store.selectedModel,
    permissionMode: store.permissionMode,
    thinkingMode: store.thinkingMode,
    apiKey: store.settings.apiKey,
    baseUrl: store.settings.baseUrl || undefined,
    projectPath: project?.path
  })
}

export function setActiveAssistant(convId: string, msgId: string): void {
  activeAssistant.set(convId, msgId)
  activeListeningConvId = convId
}

export function clearListening(): void {
  activeListeningConvId = null
}

// 读取某会话当前 assistant 消息，应用 patch 后写回 store
function patchMessage(convId: string, fn: (blocks: Block[]) => Block[]): void {
  const msgId = activeAssistant.get(convId)
  if (!msgId) return
  const store = useAppStore.getState()
  const conv = store.conversations.find((c) => c.id === convId)
  if (!conv) return
  const messages = conv.messages.map((m) =>
    m.id === msgId ? { ...m, blocks: fn(m.blocks) } : m
  )
  store.updateConversation(convId, { messages })
}

// 工具签名：用于把 permission 事件关联到 tool-use 块
function sig(name: string, input: unknown): string {
  return name + '::' + JSON.stringify(input)
}

// 早到的 permission（tool-use 尚未到达）暂存：convId → sig → permissionId
const earlyPermissions = new Map<string, Map<string, string>>()

let initialized = false

export function initChatService(): void {
  if (initialized) return
  initialized = true
  const api = window.api.chat

  // 文本增量：累加到最后一个 text 块（没有则新建）
  api.onDelta(({ convId, text }) => {
    if (convId !== activeListeningConvId) return
    patchMessage(convId, (blocks) => {
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'text') {
        return blocks.map((b, i) =>
          i === blocks.length - 1 ? { ...b, text: (b as { text: string }).text + text } : b
        )
      }
      return [...blocks, { type: 'text', text }]
    })
  })

  // 工具调用：新增 tool 块；若已有早到的授权请求则关联
  api.onToolUse(({ convId, toolId, name, input }) => {
    if (convId !== activeListeningConvId) return
    const early = earlyPermissions.get(convId)?.get(sig(name, input))
    patchMessage(convId, (blocks) => [
      ...blocks,
      {
        type: 'tool',
        toolId,
        name,
        input,
        status: early ? 'pending' : 'running',
        permissionId: early
      } as ToolBlock
    ])
  })

  // 授权请求：找到对应 tool 块标为 pending；若 tool-use 还没到则暂存
  api.onPermission(({ convId, permissionId, toolName, input }) => {
    if (convId !== activeListeningConvId) return
    let matched = false
    patchMessage(convId, (blocks) =>
      blocks.map((b) => {
        if (!matched && b.type === 'tool' && b.toolId && !b.permissionId &&
            sig(b.name, b.input) === sig(toolName, input)) {
          matched = true
          return { ...b, status: 'pending', permissionId } as ToolBlock
        }
        return b
      })
    )
    if (!matched) {
      if (!earlyPermissions.has(convId)) earlyPermissions.set(convId, new Map())
      earlyPermissions.get(convId)!.set(sig(toolName, input), permissionId)
    }
  })

  // 工具结果：按 toolId 回填，标为 completed / error
  api.onToolResult(({ convId, toolId, result, isError }) => {
    if (convId !== activeListeningConvId) return
    patchMessage(convId, (blocks) =>
      blocks.map((b) =>
        b.type === 'tool' && b.toolId === toolId
          ? { ...b, result, status: isError ? 'error' : (b.status === 'rejected' ? 'rejected' : 'completed') } as ToolBlock
          : b
      )
    )
  })

  // Usage 采集：累加到当前对话的 usage
  api.onUsage(({ convId, inputTokens, outputTokens }) => {
    if (convId !== activeListeningConvId) return
    const store = useAppStore.getState()
    const conv = store.conversations.find((c) => c.id === convId)
    if (!conv) return
    const current = conv.usage ?? { inputTokens: 0, outputTokens: 0 }
    const updated = {
      inputTokens: current.inputTokens + inputTokens,
      outputTokens: current.outputTokens + outputTokens
    }
    store.updateConversation(convId, { usage: updated })
  })

  // 完成 / 出错：清理该会话的运行态
  const finish = (convId: string) => {
    activeAssistant.delete(convId)
    earlyPermissions.delete(convId)
    const store = useAppStore.getState()
    store.setLoadingConv(null)
    if (convId !== store.activeConversationId) {
      store.addUnreadConv(convId)
    }
    // 完成后尝试自动发送队列中的下一条
    if (convId === store.activeConversationId) {
      // 使用 setTimeout 确保 setLoadingConv 先落地
      setTimeout(() => tryAutoSendQueue(), 0)
    }
  }
  api.onDone(({ convId }) => finish(convId))
  api.onResult(() => { /* 可记录 cost/turns，暂不展示 */ })
  api.onError(({ convId, message }) => {
    patchMessage(convId, (blocks) => [...blocks, { type: 'text', text: `\n\n**错误：** ${message}` }])
    finish(convId)
  })
}

// 用户点 Approve / Reject
export function respondPermission(
  convId: string, permissionId: string, approved: boolean, input?: Record<string, unknown>
): void {
  window.api.chat.respondPermission({ permissionId, approved, input })
  // 本地立即更新该 tool 块状态（结果稍后由 tool-result 覆盖）
  const store = useAppStore.getState()
  const conv = store.conversations.find((c) => c.id === convId)
  if (!conv) return
  const messages = conv.messages.map((m) => ({
    ...m,
    blocks: m.blocks.map((b) =>
      b.type === 'tool' && b.permissionId === permissionId
        ? { ...b, status: approved ? 'approved' : 'rejected' } as ToolBlock
        : b
    )
  }))
  store.updateConversation(convId, { messages })
}



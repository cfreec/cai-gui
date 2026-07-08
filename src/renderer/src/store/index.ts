import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ToolStatus = 'running' | 'pending' | 'approved' | 'rejected' | 'completed' | 'error'

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolBlock {
  type: 'tool'
  toolId: string          // SDK 的 tool_use id
  name: string            // Read / Write / Edit / Bash ...
  input: Record<string, unknown>
  status: ToolStatus
  permissionId?: string   // 待授权时主进程分配的 id
  result?: string         // 工具执行结果文本
}

export type Block = TextBlock | ToolBlock

export interface Message {
  id: string
  role: 'user' | 'assistant'
  blocks: Block[]
  createdAt: number
}

export interface Conversation {
  id: string
  title: string
  projectId: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  pinned?: boolean
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

export interface Project {
  id: string
  name: string
  path: string
}

export interface ModelConfig {
  group: string
  displayName: string
  modelId: string
  contextWindow?: number
}

export interface AppSettings {
  apiKey: string
  baseUrl: string
  models: ModelConfig[]
  theme: 'dark' | 'light' | 'system'
  language: 'auto' | 'zh' | 'en'
  sansSize: number
  sansFont: string
  codeSize: number
  codeFont: string
  collapsedFolders: string[]
}

interface AppState {
  // 设置
  settings: AppSettings
  updateSettings: (s: Partial<AppSettings>) => void

  // 项目列表
  projects: Project[]
  addProject: (p: Project) => void
  removeProject: (id: string) => void

  // 对话列表
  conversations: Conversation[]
  activeConversationId: string | null
  addConversation: (c: Conversation) => void
  updateConversation: (id: string, patch: Partial<Conversation>) => void
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string | null) => void

  // 当前选中项目
  activeProjectId: string | null
  setActiveProject: (id: string | null) => void

  // 推理强度、权限模式
  thinkingMode: string
  setThinkingMode: (m: string) => void
  permissionMode: string
  setPermissionMode: (m: string) => void

  // 选中模型
  selectedModel: string
  setSelectedModel: (m: string) => void

  // 正在运行 agent 的会话 id（null = 空闲）
  loadingConv: string | null
  setLoadingConv: (id: string | null) => void

  // 有未读回复的会话 id 列表（运行时，不持久化）
  unreadConvs: string[]
  addUnreadConv: (id: string) => void
  removeUnreadConv: (id: string) => void

  // 排队消息队列（运行时状态，不持久化）
  queue: string[]
  addQueueMessage: (text: string) => void
  removeQueueMessage: (index: number) => void
  clearQueue: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: {
        apiKey: '',
        baseUrl: 'https://api.anthropic.com',
        models: [
          { group: 'Claude', displayName: 'Claude Sonnet 4.6', modelId: 'claude-sonnet-4-6' },
          { group: 'Claude', displayName: 'Claude Opus 4.8', modelId: 'claude-opus-4-8' },
          { group: 'Claude', displayName: 'Claude Haiku 4.5', modelId: 'claude-haiku-4-5-20251001' }
        ],
        theme: 'light',
        language: 'auto',
        sansSize: 13,
        sansFont: '系统默认',
        codeSize: 12,
        codeFont: 'SF Mono / ui-monospace',
        collapsedFolders: []
      },
      updateSettings: (s) =>
        set((state) => ({ settings: { ...state.settings, ...s } })),

      projects: [],
      addProject: (p) => set((state) => ({ projects: [...state.projects, p] })),
      removeProject: (id) =>
        set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),

      conversations: [],
      activeConversationId: null,
      addConversation: (c) =>
        set((state) => ({ conversations: [c, ...state.conversations] })),
      updateConversation: (id, patch) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
          )
        })),
      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId
        })),
      setActiveConversation: (id) => set((state) => ({
        activeConversationId: id,
        unreadConvs: id ? state.unreadConvs.filter(i => i !== id) : state.unreadConvs
      })),

      activeProjectId: null,
      setActiveProject: (id) => set({ activeProjectId: id }),

      thinkingMode: 'high',
      setThinkingMode: (m) => set({ thinkingMode: m }),
      permissionMode: 'ask',
      setPermissionMode: (m) => set({ permissionMode: m }),

      selectedModel: 'claude-sonnet-4-6',
      setSelectedModel: (m) => set({ selectedModel: m }),

      loadingConv: null,
      setLoadingConv: (id) => set({ loadingConv: id }),

      unreadConvs: [],
      addUnreadConv: (id) => set((state) => ({
        unreadConvs: state.unreadConvs.includes(id) ? state.unreadConvs : [...state.unreadConvs, id]
      })),
      removeUnreadConv: (id) => set((state) => ({
        unreadConvs: state.unreadConvs.filter(i => i !== id)
      })),

      queue: [],
      addQueueMessage: (text) => set((state) => ({ queue: [...state.queue, text] })),
      removeQueueMessage: (index) =>
        set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),
      clearQueue: () => set({ queue: [] })
    }),
    {
      name: 'ai-cgent-store',
      version: 8,
      partialize: (state) => {
        // loadingConv、unreadConvs 是纯运行时状态，不持久化
        const { loadingConv, unreadConvs, ...rest } = state as AppState & Record<string, unknown>
        void loadingConv
        void unreadConvs
        return rest as unknown as AppState
      },
      migrate: (state: unknown) => {
        const s = state as AppState
        if (!s.settings) return s
        if (!['light', 'dark', 'system'].includes(s.settings.theme)) s.settings.theme = 'light'
        if (!s.settings.language) s.settings.language = 'auto'
        s.settings.sansSize = 13
        if (!s.settings.codeSize) s.settings.codeSize = 12
        if (!s.settings.sansFont) s.settings.sansFont = '系统默认'
        if (!s.settings.codeFont) s.settings.codeFont = 'SF Mono / ui-monospace'
        if (!s.settings.collapsedFolders) s.settings.collapsedFolders = []
        const validSans = ['系统默认', '微软雅黑', '宋体', '黑体', '楷体', 'Segoe UI', 'Arial', 'Times New Roman', 'Tahoma', 'Verdana']
        const validMono = ['SF Mono / ui-monospace', 'Menlo', 'Monaco', 'JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
        if (!validSans.includes(s.settings.sansFont)) s.settings.sansFont = '系统默认'
        if (!validMono.includes(s.settings.codeFont)) s.settings.codeFont = 'SF Mono / ui-monospace'
        // v8：Message.content:string → blocks:Block[]
        if (Array.isArray(s.conversations)) {
          for (const conv of s.conversations) {
            if (!Array.isArray(conv.messages)) continue
            for (const m of conv.messages as Array<Message & { content?: string }>) {
              if (m.blocks) continue
              m.blocks = [{ type: 'text', text: m.content ?? '' }]
              delete m.content
            }
          }
        }
        return s
      }
    }
  )
)

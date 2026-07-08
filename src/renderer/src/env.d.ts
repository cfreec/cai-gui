interface FileEntry {
  name: string
  isDirectory: boolean
  path: string
}

declare module '*.svg?url' {
  const src: string
  export default src
}

interface ChatSendPayload {
  convId: string
  prompt: string
  model: string
  permissionMode: string
  thinkingMode: string
  apiKey: string
  baseUrl?: string
  projectPath?: string
}

interface ChatPermissionResponse {
  permissionId: string
  approved: boolean
  input?: Record<string, unknown>
}

interface Window {
  api: {
    readDir: (dirPath: string) => Promise<FileEntry[]>
    selectFolder: () => Promise<string | null>
    listModels: (data: { apiKey: string; baseUrl?: string }) => Promise<Array<{ id: string; contextWindow?: number }>>
    openPath: (dirPath: string) => Promise<string>
    defaultWorkspace: () => Promise<string>
    onWindowFocus: (cb: (focused: boolean) => void) => void
    chat: {
      send: (payload: ChatSendPayload) => Promise<boolean>
      abort: (convId: string) => Promise<boolean>
      respondPermission: (data: ChatPermissionResponse) => Promise<boolean>
      onDelta: (cb: (d: { convId: string; text: string }) => void) => () => void
      onToolUse: (cb: (d: { convId: string; toolId: string; name: string; input: Record<string, unknown> }) => void) => () => void
      onToolResult: (cb: (d: { convId: string; toolId: string; result: string; isError: boolean }) => void) => () => void
      onPermission: (cb: (d: { convId: string; permissionId: string; toolName: string; input: Record<string, unknown>; title?: string; reason?: string }) => void) => () => void
      onResult: (cb: (d: { convId: string; subtype: string; costUsd: number; numTurns: number }) => void) => () => void
      onUsage: (cb: (d: { convId: string; inputTokens: number; outputTokens: number }) => void) => () => void
      onDone: (cb: (d: { convId: string }) => void) => () => void
      onError: (cb: (d: { convId: string; message: string }) => void) => () => void
    }
  }
}

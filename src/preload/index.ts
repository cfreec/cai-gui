import { contextBridge, ipcRenderer } from 'electron'

// 监听辅助：返回取消函数
function on(channel: string, cb: (data: unknown) => void): () => void {
  const listener = (_e: unknown, data: unknown) => cb(data)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('api', {
  readDir: (dirPath: string) => ipcRenderer.invoke('read-dir', dirPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  listModels: (data: { apiKey: string; baseUrl?: string }) => ipcRenderer.invoke('models:list', data),
  openPath: (dirPath: string) => ipcRenderer.invoke('open-path', dirPath),
  defaultWorkspace: () => ipcRenderer.invoke('default-workspace'),
  onWindowFocus: (cb: (focused: boolean) => void) => {
    ipcRenderer.on('window-focus', (_, focused) => cb(focused))
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
  chat: {
    send: (payload: unknown) => ipcRenderer.invoke('chat:send', payload),
    abort: (convId: string) => ipcRenderer.invoke('chat:abort', convId),
    respondPermission: (data: unknown) => ipcRenderer.invoke('chat:permission-response', data),
    onDelta: (cb: (d: unknown) => void) => on('chat:delta', cb),
    onToolUse: (cb: (d: unknown) => void) => on('chat:tool-use', cb),
    onToolResult: (cb: (d: unknown) => void) => on('chat:tool-result', cb),
    onPermission: (cb: (d: unknown) => void) => on('chat:permission', cb),
    onResult: (cb: (d: unknown) => void) => on('chat:result', cb),
    onUsage: (cb: (d: unknown) => void) => on('chat:usage', cb),
    onDone: (cb: (d: unknown) => void) => on('chat:done', cb),
    onError: (cb: (d: unknown) => void) => on('chat:error', cb)
  }
})

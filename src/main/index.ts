import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerChatHandlers } from './chat'

const TITLEBAR_HEIGHT = 32

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1000,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  // 失焦/获焦时通知渲染进程
  win.on('blur', () => {
    win.webContents.send('window-focus', false)
  })

  win.on('focus', () => {
    win.webContents.send('window-focus', true)
  })

  // 窗口操作 IPC
  ipcMain.on('window:minimize', () => win.minimize())
  ipcMain.on('window:maximize', () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('window:close', () => win.close())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.personal.ai-cgent')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  registerChatHandlers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('read-dir', async (_, dirPath: string) => {
  const fs = await import('fs')
  const path = await import('path')
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    return entries.map(e => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      path: path.join(dirPath, e.name)
    }))
  } catch { return [] }
})

ipcMain.handle('select-folder', async () => {
  const { dialog } = await import('electron')
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0]
})

// 拉取模型列表（主进程调用，避免渲染进程 CORS / node 依赖）
ipcMain.handle('models:list', async (_e, { apiKey, baseUrl }: { apiKey: string; baseUrl?: string }) => {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey, baseURL: baseUrl || undefined })
  const res = await client.models.list()
  return res.data.map((m: { id: string; context_window?: number }) => ({
    id: m.id,
    contextWindow: m.context_window
  }))
})

// 在系统文件管理器中打开文件夹
ipcMain.handle('open-path', async (_e, dirPath: string) => {
  return shell.openPath(dirPath)
})

// 默认工作区路径（default 文件夹），目录不存在时自动创建
ipcMain.handle('default-workspace', async () => {
  const { mkdir } = await import('fs/promises')
  const p = join(app.getPath('userData'), 'workspaces', 'default')
  await mkdir(p, { recursive: true })
  return p
})

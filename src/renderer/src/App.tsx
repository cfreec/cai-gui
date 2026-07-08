import { useEffect, useRef, useState } from 'react'
import { useAppStore } from './store'
import { sansStack, monoStack } from './lib/fonts'
import { initChatService } from './lib/chatService'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import SettingsDialog from './components/SettingsDialog'
import { useT } from './lib/i18n'
import { PanelLeftOpen, Plus, Minus, Square, X } from 'lucide-react'
import Tooltip from './components/Tooltip'

// 缩放基准：默认 sansSize=13 时视觉等于 14px
const BASE_SIZE = 14.5

export default function App() {
  const settings = useAppStore((s) => s.settings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [focused, setFocused] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [lineVisible, setLineVisible] = useState(false)
  const lineRef = useRef<HTMLDivElement>(null)
  const sidebarContainerRef = useRef<HTMLDivElement>(null) // 侧边栏外层容器
  const sidebarInnerRef = useRef<HTMLDivElement>(null)     // Sidebar 内层根 div（通过回调传入）
  const draggingRef = useRef(false)
  const t = useT()

  // 主题
  useEffect(() => {
    if (settings.theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', dark)
    } else {
      document.documentElement.classList.toggle('dark', settings.theme === 'dark')
    }
  }, [settings.theme])

  // 字体族（全局）
  useEffect(() => {
    document.body.style.fontFamily = sansStack(settings.sansFont ?? '系统默认')
    document.documentElement.style.setProperty('--font-family-mono', monoStack(settings.codeFont ?? 'SF Mono / ui-monospace'))
    document.documentElement.style.setProperty('--font-size-code', `${settings.codeSize ?? 12}px`)
  }, [settings.sansFont, settings.codeFont, settings.codeSize])

  // 窗口焦点
  useEffect(() => {
    window.api.onWindowFocus((f) => setFocused(f))
  }, [])

  // 初始化聊天 IPC 监听（一次）
  useEffect(() => {
    initChatService()
  }, [])

  // 整体缩放：字号 / 基准，sansSize=14 时 scale ≈ 1.077
  const scale = (settings.sansSize ?? 13) / BASE_SIZE

  // ===== 侧边栏拖拽调整宽度 =====
  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault()
    draggingRef.current = true

    // 拖动期间全局 cursor 锁定为 col-resize，防止鼠标移出热区后变回默认样式
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const startClientX = e.clientX
    const startWidth = sidebarWidth

    if (sidebarContainerRef.current) {
      sidebarContainerRef.current.style.transition = 'none'
    }

    function onMove(ev: MouseEvent) {
      const delta = ev.clientX - startClientX
      const newWidth = Math.min(400, Math.max(180, startWidth + delta / scale))

      if (sidebarContainerRef.current) {
        sidebarContainerRef.current.style.width = newWidth + 'px'
      }
      if (sidebarInnerRef.current) {
        sidebarInnerRef.current.style.width = newWidth + 'px'
      }
      // 绿线跟随实际 sidebar 宽度（被钳制后的值），而非鼠标位置
      if (lineRef.current) {
        lineRef.current.style.left = (newWidth * scale) + 'px'
      }
    }

    function onUp() {
      draggingRef.current = false

      // 恢复 cursor
      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      const finalWidth = sidebarContainerRef.current
        ? Math.min(400, Math.max(180, parseFloat(sidebarContainerRef.current.style.width) || startWidth))
        : startWidth
      setSidebarWidth(finalWidth)

      if (sidebarContainerRef.current) {
        sidebarContainerRef.current.style.transition = ''
      }

      setLineVisible(false)

      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      {/* 顶部标题栏 — 32px，自定义拖拽区域 + 窗口操作按钮 */}
      <div
        className="drag-region flex-shrink-0 flex items-center justify-between"
        style={{
          height: 32,
          background: focused ? '#26C6C0' : '#f5f5f5',
          WebkitAppRegion: 'drag',
          zIndex: 100,
          position: 'relative'
        } as React.CSSProperties}
      >
        <div className="no-drag flex items-center gap-1.5 pl-3">
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#1a9e8f', flexShrink: 0 }} />
          <span style={{
            fontSize: 14, fontWeight: 700,
            color: focused ? '#ffffff' : '#999999',
            letterSpacing: '-0.3px'
          }}>
            0011
          </span>
        </div>

        {/* 窗口操作按钮 — 右对齐，与标题栏同高 */}
        <div className="no-drag flex items-center h-full" style={{ gap: 0 }}>
          {[
            { icon: <Minus size={14} />, action: 'minimize' },
            { icon: <Square size={12} />, action: 'maximize' },
            {
              icon: <X size={14} />,
              action: 'close',
              hoverBg: '#e81123',
              hoverColor: '#ffffff'
            }
          ].map((btn, i) => (
            <button
              key={i}
              onClick={() => (window.api as any).window[btn.action]()}
              className="flex items-center justify-center transition-colors"
              style={{
                width: 46,
                height: 32,
                color: focused ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                cursor: 'default',
                fontSize: 0
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = btn.hoverBg || 'rgba(0,0,0,0.06)'
                e.currentTarget.style.color = btn.hoverColor || (focused ? '#ffffff' : '#000000')
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = focused ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)'
              }}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 — 缩放容器 */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ zoom: scale } as React.CSSProperties}
      >
        <div className="flex h-full w-full transition-all duration-300 ease-linear">
          {/* 侧边栏外层容器 */}
          <div
            ref={sidebarContainerRef}
            className="flex-shrink-0 h-full overflow-visible transition-all duration-300 ease-linear"
            style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
          >
            <Sidebar
              onOpenSettings={() => setSettingsOpen(true)}
              isCollapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(v => !v)}
              width={sidebarWidth}
              innerRef={sidebarInnerRef}
            />
          </div>

          {/* 拖拽热区 — 只有 4px 宽，精准贴在侧边栏右边框上
              整个热区 hover 即显示绿线，不需要 offsetX 判断，完全避开 zoom 坐标系问题 */}
          {!sidebarCollapsed && (
            <div
              className="no-drag"
              style={{
                position: 'absolute',
                left: sidebarWidth - 1,  // 热区贴在边框上
                top: 0,
                bottom: 0,
                width: 2,
                cursor: 'col-resize',
                zIndex: 50,
              }}
              onMouseEnter={(e) => {
                setLineVisible(true)
                if (lineRef.current) {
                  // 绿线对齐右侧主体左边框：逻辑宽度 × scale = 屏幕坐标
                  lineRef.current.style.left = (sidebarWidth * scale) + 'px'
                }
              }}
              onMouseMove={(e) => {
                if (lineRef.current) {
                  lineRef.current.style.left = (sidebarWidth * scale) + 'px'
                }
              }}
              onMouseLeave={() => {
                if (!draggingRef.current) setLineVisible(false)
              }}
              onMouseDown={handleDragStart}
            />
          )}

          {/* 右侧面板卡片 */}
          <div
            className="flex-1 flex flex-col relative"
            style={{
              background: 'var(--bg-main)',
              borderRadius: sidebarCollapsed ? '4px' : '25px 15px 15px 25px',
              boxShadow: sidebarCollapsed
                ? 'none'
                : '-12px 0 20px -8px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
          >
            <ChatArea collapsed={sidebarCollapsed} onCollapse={() => setSidebarCollapsed(false)} />
          </div>
        </div>

        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <div id="zoom-portal" />
      </div>

      {/* 拖拽绿线 — zoom 容器外，fixed 定位不受缩放影响 */}
      <div
        ref={lineRef}
        style={{
          display: lineVisible ? 'block' : 'none',
          position: 'fixed',
          left: sidebarWidth,
          top: 32,
          bottom: 0,
          width: 3,
          background: '#7cd4b5',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
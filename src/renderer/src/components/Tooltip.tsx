import { useState, useRef, ReactNode } from 'react'
import { Portal } from '../lib/portal'
import { useAppStore } from '../store'

export default function Tooltip({ label, children, disabled, side = 'top', align = 'center', portal }: {
  label: string
  children: ReactNode
  disabled?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  portal?: boolean
}) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const theme = useAppStore((s) => s.settings.theme ?? 'system')

  const resolvedTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme
  const bgColor = resolvedTheme === 'dark' ? '#16162a' : '#ffffff'
  const textColor = resolvedTheme === 'dark' ? '#fff' : '#000'

  // Portal 模式：fixed 定位，避免被 overflow 裁切
  function updatePos() {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    const GAP = 6
    let top = 0, left = 0
    if (side === 'right') {
      top = r.top + r.height / 2
      left = r.right + GAP
    } else if (side === 'left') {
      top = r.top + r.height / 2
      left = r.left - GAP
    } else if (side === 'bottom') {
      top = r.bottom + GAP
      left = r.left + r.width / 2
    } else { // top
      top = r.top - GAP
      left = r.left + r.width / 2
    }
    setPos({ top, left })
  }

  const translateMap: Record<string, Record<string, string>> = {
    top:    { start: 'translate(-8px, -100%)',  center: 'translate(-50%, -100%)', end: 'translate(calc(-100% + 8px), -100%)' },
    bottom: { start: 'translate(-8px, 0)',       center: 'translate(-50%, 0)',     end: 'translate(calc(-100% + 8px), 0)' },
    right:  { start: 'translate(0, -8px)',       center: 'translate(0, -50%)',     end: 'translate(0, calc(-100% + 8px))' },
    left:   { start: 'translate(-100%, -8px)',   center: 'translate(-100%, -50%)', end: 'translate(-100%, calc(-100% + 8px))' },
  }

  if (disabled) return <>{children}</>

  // Portal 模式
  if (portal) {
    return (
      <div
        ref={ref}
        className="inline-flex"
        onMouseEnter={() => { updatePos(); setShow(true) }}
        onMouseLeave={() => setShow(false)}
      >
        {children}
        {show && label && (
          <Portal>
            <div
              className="px-2 py-1 rounded text-[11px] whitespace-nowrap pointer-events-none"
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                transform: translateMap[side][align],
                background: bgColor,
                color: textColor,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 99999,
              }}
            >
              {label}
            </div>
          </Portal>
        )}
      </div>
    )
  }

  // 默认模式：absolute 定位（原有行为保持不变）
  const baseOffset = {
    top: 'bottom-full mb-1',
    right: 'left-full ml-1',
    bottom: 'top-full mt-1',
    left: 'right-full mr-1'
  }

  const alignTransforms = {
    top:    { start: '-translate-x-[calc(50%-8px)]', center: '-translate-x-1/2', end: '-translate-x-[calc(50%+8px)]' },
    bottom: { start: '-translate-x-[calc(50%-8px)]', center: '-translate-x-1/2', end: '-translate-x-[calc(50%+8px)]' },
    right:  { start: '-translate-y-[calc(50%-4px)]', center: '-translate-y-1/2', end: '-translate-y-[calc(50%+4px)]' },
    left:   { start: '-translate-y-[calc(50%-4px)]', center: '-translate-y-1/2', end: '-translate-y-[calc(50%+4px)]' }
  }

  const positionClasses = `${baseOffset[side]} ${alignTransforms[side][align]}`

  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && label && (
        <div className={`absolute left-1/2 ${positionClasses} px-2 py-1 rounded text-[11px] whitespace-nowrap z-[100] pointer-events-none`}
          style={{ background: bgColor, color: textColor, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          {label}
        </div>
      )}
    </div>
  )
}

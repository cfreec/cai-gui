import { ReactNode } from 'react'
import ReactDOM from 'react-dom'

export function Portal({ children }: { children: ReactNode }) {
  return typeof document !== 'undefined' ? ReactDOM.createPortal(children, document.body) : <>{children}</>
}

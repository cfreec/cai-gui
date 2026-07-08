import { useAppStore } from '../store'
import WelcomePage from './WelcomePage'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'
import { useT } from '../lib/i18n'
import { PanelLeftOpen, Plus, FolderOpen } from 'lucide-react'
import Tooltip from './Tooltip'

export default function ChatArea({ collapsed, onCollapse }: { collapsed?: boolean; onCollapse?: () => void }) {
  const { activeConversationId, conversations, projects } = useAppStore()
  const t = useT()
  const conv = conversations.find(c => c.id === activeConversationId)

  // 只有对话存在且有消息时才显示聊天页，否则显示欢迎页
  const showChat = conv && conv.messages.length > 0
  const titleText = showChat ? conv.title : t('sidebar.newChatTitle')

  // 当前对话所属项目名
  const folderName = conv
    ? conv.projectId === 'default'
      ? t('welcome.defaultProject')
      : projects.find(p => p.id === conv.projectId)?.name ?? conv.projectId
    : null

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      {/* 标题行 — 始终显示，贴面板最左侧 */}
      <div className="h-12 flex-shrink-0 flex items-center pl-4 pr-3" style={{ background: '#ffffff' }}>
        {collapsed && onCollapse ? (
          <>
            <Tooltip label={t('sidebar.expand')} side="bottom" align="start">
              <button
                onClick={onCollapse}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <PanelLeftOpen size={16} />
              </button>
            </Tooltip>
            <Tooltip label={t('sidebar.newChat')} side="bottom" align="start">
              <button
                onClick={() => useAppStore.getState().setActiveConversation(null)}
                className="p-1 rounded transition-colors ml-2"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Plus size={16} />
              </button>
            </Tooltip>
          </>
        ) : null}
        {/* 文件夹 badge */}
        {folderName && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-md flex-shrink-0 ml-6"
            style={{ background: '#f5f5f5', color: 'var(--text-muted)' }}
          >
            <FolderOpen size={13} style={{ flexShrink: 0 }} />
            <span className="text-[12px] max-w-[120px] truncate">{folderName}</span>
          </div>
        )}
        <span
          className="text-[13px] font-medium truncate"
          style={{ color: 'var(--text-secondary)', marginLeft: folderName ? 8 : 24 }}
        >
          {titleText}
        </span>
      </div>
      {/* 聊天区域 */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        {showChat ? (
          <>
            <ChatMessages conversation={conv} />
          </>
        ) : (
          <>
            <WelcomePage />
          </>
        )}
        <div style={{ maxWidth: 900, minWidth: 400, margin: '0 auto', width: '100%' }}>
          <ChatInput />
        </div>
      </div>
    </div>
  )
}

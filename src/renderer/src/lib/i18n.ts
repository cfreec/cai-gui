// 极简 i18n：翻译表 + useT hook
import { useAppStore } from '../store'

type Lang = 'zh' | 'en'

export const translations = {
  zh: {
    // 侧边栏
    'sidebar.conversations': '对话',
    'sidebar.newChat': '新建对话',
    'sidebar.search': '搜索对话...',
    'sidebar.empty': '暂无对话',
    'sidebar.settings': '设置',
    'sidebar.pin': '置顶',
    'sidebar.unpin': '取消置顶',
    'sidebar.delete': '删除',
    'sidebar.addProject': '添加项目文件夹',
    'sidebar.collapse': '收起侧边栏',
    'sidebar.expand': '展开侧边栏',
    'sidebar.newChatTitle': '新建对话',

    // 文件夹右键菜单
    'folder.open': '打开文件夹',
    'folder.copyPath': '复制文件夹路径',
    'folder.deleteAll': '删除全部对话',
    'folder.confirmDelete': '确认删除全部？',

    // 欢迎页
    'welcome.title': "Let's build",
    'welcome.defaultProject': 'default',

    // 设置导航
    'settings.title': '设置',
    'nav.general': '通用',
    'nav.account': '账户',
    'nav.models': '模型配置',
    'nav.usage': '用量',
    'nav.skills': 'Skills 技能',
    'nav.about': '关于',

    // 占位页
    'placeholder.usage.title': '用量',
    'placeholder.usage.desc': '查看 API 使用量统计。',
    'placeholder.skills.title': 'Skills 技能',
    'placeholder.skills.desc': '管理已安装的技能。',
    'placeholder.about.title': '关于',
    'placeholder.about.desc': '应用信息与版本。',

    // 通用页
    'general.subtitle': '管理语言、外观以及其他全局偏好。',
    'general.language': '语言',
    'general.language.desc1': '设置应用界面的显示语言。',
    'general.language.auto': '当前为自动检测，正在跟随系统语言：中文。',
    'general.language.zh': '当前已手动设置为：中文。',
    'general.language.en': '当前已手动设置为：英文。',
    'general.appearance': '外观',
    'general.appearance.desc': '调整整个应用使用的主题和字体设置。',
    'general.theme': '主题',
    'general.theme.desc': '在浅色、深色和跟随系统之间切换，改动立即生效。',
    'general.theme.light': '浅色',
    'general.theme.dark': '深色',
    'general.theme.system': '跟随系统',
    'general.sansFont': '无衬线字体',
    'general.sansFont.desc': '调整 0011 界面使用的字体和字号。',
    'general.sansFont.hint': '8px - 20px，影响侧边栏、设置页和聊天正文。',
    'general.codeFont': '代码字体',
    'general.codeFont.desc': '调整代码、工具结果和输出区域使用的字体和字号。',
    'general.codeFont.hint': '8px - 20px，影响代码块、diff、命令输出和文件内容。',
    'lang.auto': '自动检测',
    'lang.zh': '中文',
    'lang.en': 'English',

    // ChatInput
    'input.sendHint': '发送',
    'input.attachHint': '添加文件等',
    'input.modelHint': '选择模型',
    'input.thinkingHint': '选择推理强度',
    'input.thinkingLabel': '推理强度',
    'input.permissionHint': '更改权限',
    'input.contextWindow': '上下文窗口:',
    'input.contextUsed': '已使用 {percent}% (剩余 {remaining}%)',
    'input.contextTokens': '已使用 {used} / {total} tokens',
    'input.replyingPlaceholder': 'Claude 正在回复，可以继续提问',
    'input.placeholder': '向 Claude Code 提问...',
    'input.thinking': '思考中',
    'input.permission': '权限模式',
    'model.group.default': '模型组',
    'model.group.Claude': 'Claude',
    'input.queueSend': '发送',
    'input.queueDelete': '删除',
    'input.sendKeyHint': 'Enter 发送',
    'input.enterShiftHint': 'Shift+Enter 换行',

    // 推理强度选项
    'thinking.default': '默认（高）',
    'thinking.low': '低',
    'thinking.medium': '中',
    'thinking.xhigh': '超高',
    'thinking.max': '最大',

    // 权限模式选项
    'permission.auto': '自动',
    'permission.ask': '询问权限',
    'permission.accept': '接受编辑',
    'permission.plan': 'Plan Mode',
    'permission.bypass': '跳过权限',

    // 消息操作
    'message.retry': 'Retry',
    'message.edit': 'Edit',
    'message.copy': 'Copy',

    // 权限模式提示
    'permission.auto.hint': '由模型分类器自动审批或拒绝权限请求',
    'permission.ask.hint': '执行风险操作前询问确认',
    'permission.accept.hint': '自动接受文件编辑，无需确认',
    'permission.plan.hint': 'Planning mode, no actual tool execution',
    'permission.bypass.hint': '跳过所有权限检查',

    // ToolBlock
    'tool.read': 'Read file(s)',
    'tool.write': 'Write file',
    'tool.edit': 'Edit file',
    'tool.bash': 'Run command',
    'tool.grep': 'Search content',
    'tool.glob': 'Find files',
    'tool.pending': 'Waiting for approval',
    'tool.running': 'Running',
    'tool.completed': 'Completed',
    'tool.rejected': 'Rejected',
    'tool.failed': 'Failed',
    'tool.request': 'Claude 请求执行 <b>{name}</b>。批准后将运行此工具。',
    'tool.rawInput': 'Raw Input',
    'tool.copy': 'Copy',
    'tool.copied': '已复制',
    'tool.result': 'Result',
    'tool.expandResult': '结果较长，当前显示前 4000 字符，点击展开完整结果',
    'tool.collapseResult': '收起完整结果',
    'tool.reject': 'Reject',
    'tool.approve': 'Approve',

    // 停止按钮
    'stop': '停止',

    // 输入区底部提示
    'input.keyHint': 'Enter 发送',
    'input.shiftHint': 'Shift+Enter 换行',

    // 模型设置
    'model.group': '分组名称',
    'model.display': '显示名称',
    'model.call': '调用名称',
    'model.add': '添加模型',
    'model.fetch': '获取模型',
    'model.addCount': '添加 {count} 个模型',
    'model.groupPlaceholder': 'default',

    // 账户设置
    'account.apiKey': 'API Key',
    'account.apiKeyPlaceholder': 'sk-ant-...',
    'account.baseUrl': 'Base URL',
    'account.baseUrlPlaceholder': 'https://api.anthropic.com',
    'account.urlHint': '留空使用官方 API，可填写自定义代理地址',

    // 错误提示
    'alert.noApiKey': '请先填写 API Key',
    'alert.fetchFailed': '获取模型失败：',

    // 滚动
    'scroll.toBottom': '滚动到底部',
  },
  en: {
    'sidebar.conversations': 'Chats',
    'sidebar.newChat': 'New chat',
    'sidebar.search': 'Search chats...',
    'sidebar.empty': 'No conversations',
    'sidebar.settings': 'Settings',
    'sidebar.pin': 'Pin',
    'sidebar.unpin': 'Unpin',
    'sidebar.delete': 'Delete',
    'sidebar.addProject': 'Add project folder',
    'sidebar.collapse': 'Collapse sidebar',
    'sidebar.expand': 'Expand sidebar',
    'sidebar.newChatTitle': 'New Chat',

    // Folder context menu
    'folder.open': 'Open folder',
    'folder.copyPath': 'Copy folder path',
    'folder.deleteAll': 'Delete all conversations',
    'folder.confirmDelete': 'Confirm delete all?',

    // Welcome page
    'welcome.title': "Let's build",
    'welcome.defaultProject': 'default',

    // Settings navigation
    'settings.title': 'Settings',
    'nav.general': 'General',
    'nav.account': 'Account',
    'nav.models': 'Models',
    'nav.usage': 'Usage',
    'nav.skills': 'Skills',
    'nav.about': 'About',

    // Placeholder pages
    'placeholder.usage.title': 'Usage',
    'placeholder.usage.desc': 'View API usage statistics.',
    'placeholder.skills.title': 'Skills',
    'placeholder.skills.desc': 'Manage installed skills.',
    'placeholder.about.title': 'About',
    'placeholder.about.desc': 'App info and version.',

    // General settings
    'general.subtitle': 'Manage language, appearance and other global preferences.',
    'general.language': 'Language',
    'general.language.desc1': 'Set the display language of the app.',
    'general.language.auto': 'Auto-detect is on, following system language: English.',
    'general.language.zh': 'Manually set to: Chinese.',
    'general.language.en': 'Manually set to: English.',
    'general.appearance': 'Appearance',
    'general.appearance.desc': 'Adjust the theme and font settings used across the app.',
    'general.theme': 'Theme',
    'general.theme.desc': 'Switch between light, dark and system. Applies instantly.',
    'general.theme.light': 'Light',
    'general.theme.dark': 'Dark',
    'general.theme.system': 'System',
    'general.sansFont': 'Sans-serif font',
    'general.sansFont.desc': 'Adjust the font and size used in the 0011 interface.',
    'general.sansFont.hint': '8px - 20px, affects sidebar, settings and chat body.',
    'general.codeFont': 'Code font',
    'general.codeFont.desc': 'Adjust the font for code, tool results and output areas.',
    'general.codeFont.hint': '8px - 20px, affects code blocks, diffs, command output and files.',
    'lang.auto': 'Auto-detect',
    'lang.zh': '中文',
    'lang.en': 'English',

    // ChatInput
    'input.sendHint': 'Send',
    'input.attachHint': 'Add files',
    'input.modelHint': 'Select model',
    'input.thinkingHint': 'Select reasoning effort',
    'input.thinkingLabel': 'Reasoning effort',
    'input.permissionHint': 'Change permissions',
    'input.contextWindow': 'Context window:',
    'input.contextUsed': 'Used {percent}% (remaining {remaining}%)',
    'input.contextTokens': 'Used {used} / {total} tokens',
    'input.replyingPlaceholder': 'Claude is replying, you can keep asking',
    'input.placeholder': 'Ask Claude Code...',
    'input.thinking': 'Thinking',
    'input.permission': 'Permission',
    'model.group.default': 'Model group',
    'model.group.Claude': 'Claude',
    'input.queueSend': 'Send',
    'input.queueDelete': 'Delete',
    'input.sendKeyHint': 'Enter to send',
    'input.enterShiftHint': 'Shift+Enter for new line',

    // Thinking mode options
    'thinking.default': 'Default (High)',
    'thinking.low': 'Low',
    'thinking.medium': 'Medium',
    'thinking.xhigh': 'Extra High',
    'thinking.max': 'Maximum',

    // Permission mode options
    'permission.auto': 'Auto',
    'permission.ask': 'Ask',
    'permission.accept': 'Accept Edits',
    'permission.plan': 'Plan Mode',
    'permission.bypass': 'Bypass',

    // Message actions
    'message.retry': 'Retry',
    'message.edit': 'Edit',
    'message.copy': 'Copy',

    // Permission mode hints
    'permission.auto.hint': 'Use a model classifier to approve/deny permission prompts automatically',
    'permission.ask.hint': 'Prompt for confirmation before dangerous operations',
    'permission.accept.hint': 'Auto-accept file edit operations without confirmation',
    'permission.plan.hint': 'Planning mode, no actual tool execution',
    'permission.bypass.hint': 'Bypass all permission checks',

    // ToolBlock
    'tool.read': 'Read file(s)',
    'tool.write': 'Write file',
    'tool.edit': 'Edit file',
    'tool.bash': 'Run command',
    'tool.grep': 'Search content',
    'tool.glob': 'Find files',
    'tool.pending': 'Waiting for approval',
    'tool.running': 'Running',
    'tool.completed': 'Completed',
    'tool.rejected': 'Rejected',
    'tool.failed': 'Failed',
    'tool.request': 'Claude requests to execute <b>{name}</b>. The tool will run after approval.',
    'tool.rawInput': 'Raw Input',
    'tool.copy': 'Copy',
    'tool.copied': 'Copied',
    'tool.result': 'Result',
    'tool.expandResult': 'Result is long. Showing the first 4000 characters. Click to expand.',
    'tool.collapseResult': 'Collapse full result',
    'tool.reject': 'Reject',
    'tool.approve': 'Approve',

    // Stop button
    'stop': 'Stop',

    // Input footer hint
    'input.keyHint': 'Enter to send',
    'input.shiftHint': 'Shift+Enter for new line',

    // Model settings
    'model.group': 'Group',
    'model.display': 'Display Name',
    'model.call': 'Model ID',
    'model.add': 'Add Model',
    'model.fetch': 'Fetch Models',
    'model.addCount': 'Add {count} Models',
    'model.groupPlaceholder': 'default',

    // Account settings
    'account.apiKey': 'API Key',
    'account.apiKeyPlaceholder': 'sk-ant-...',
    'account.baseUrl': 'Base URL',
    'account.baseUrlPlaceholder': 'https://api.anthropic.com',
    'account.urlHint': 'Leave blank for official API, or enter a custom proxy URL',

    // Alerts
    'alert.noApiKey': 'Please enter your API Key first',
    'alert.fetchFailed': 'Failed to fetch models: ',

    // Scroll
    'scroll.toBottom': 'Scroll to bottom',
  }
} as const

export type TKey = keyof typeof translations['zh']

export function resolveLang(setting: 'auto' | 'zh' | 'en'): Lang {
  if (setting === 'zh' || setting === 'en') return setting
  // auto：跟随系统，navigator.language 以 zh 开头则中文
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function useT() {
  const language = useAppStore((s) => s.settings.language ?? 'auto')
  const lang = resolveLang(language)
  return (key: TKey): string => translations[lang][key] ?? translations.zh[key] ?? key
}

// 显示名 → 真实 CSS 字体栈映射
// 注意：必须用 Windows 上确实存在的字体，否则切换看不出变化

export function sansStack(name: string): string {
  switch (name) {
    case '系统默认':
      return `system-ui, -apple-system, 'Segoe UI', 'Microsoft YaHei', sans-serif`
    case '微软雅黑':
      return `'Microsoft YaHei', sans-serif`
    case '宋体':
      return `'SimSun', '宋体', serif`
    case '黑体':
      return `'SimHei', '黑体', sans-serif`
    case '楷体':
      return `'KaiTi', '楷体', serif`
    case 'Segoe UI':
      return `'Segoe UI', sans-serif`
    case 'Arial':
      return `Arial, Helvetica, sans-serif`
    case 'Times New Roman':
      return `'Times New Roman', Times, serif`
    case 'Tahoma':
      return `Tahoma, Geneva, sans-serif`
    case 'Verdana':
      return `Verdana, Geneva, sans-serif`
    default:
      return `system-ui, -apple-system, 'Segoe UI', 'Microsoft YaHei', sans-serif`
  }
}

export function monoStack(name: string): string {
  switch (name) {
    case 'SF Mono / ui-monospace':
      return `'SF Mono', ui-monospace, monospace`
    case 'Menlo':
      return `Menlo, Monaco, Consolas, monospace`
    case 'Monaco':
      return `Monaco, Menlo, Consolas, monospace`
    case 'JetBrains Mono':
      return `'JetBrains Mono', Consolas, monospace`
    case 'Fira Code':
      return `'Fira Code', Consolas, monospace`
    case 'Consolas':
      return `Consolas, ui-monospace, monospace`
    case 'monospace':
      return `monospace, 'Courier New', Courier`
    default:
      return `'SF Mono', ui-monospace, monospace`
  }
}

// 下拉选项列表
export const SANS_FONT_OPTIONS = [
  '系统默认', '微软雅黑', '宋体', '黑体', '楷体',
  'Segoe UI', 'Arial', 'Times New Roman', 'Tahoma', 'Verdana'
]

export const MONO_FONT_OPTIONS = [
  'SF Mono / ui-monospace', 'Menlo', 'Monaco', 'JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'
]

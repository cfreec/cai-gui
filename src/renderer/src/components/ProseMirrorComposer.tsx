import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Schema, Fragment, Slice, Node as ProseMirrorNode } from 'prosemirror-model'
import { EditorState, Plugin, PluginKey, TextSelection, Transaction } from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'

export type ComposerHandle = {
  reset: () => void
  insertPlainText: (text: string) => void
}

type ComposerProps = {
  placeholder: string
  onChange: (markdown: string, hasContent: boolean) => void
  onSend: (markdown?: string) => void
}

const composerSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0]
    },
    code_block: {
      content: 'text*',
      group: 'block',
      code: true,
      defining: true,
      marks: '',
      attrs: { language: { default: '' } },
      parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
      toDOM: node => [
        'pre',
        {
          class: 'pm-code-block',
          'data-language': node.attrs.language || '',
          spellcheck: 'false',
          autocorrect: 'off',
          autocapitalize: 'off'
        },
        ['code', { spellcheck: 'false' }, 0]
      ]
    },
    text: { group: 'inline' },
    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [{ tag: 'br' }],
      toDOM: () => ['br']
    }
  },
  marks: {}
})

const emptyDoc = () => composerSchema.nodes.doc.create(null, [composerSchema.nodes.paragraph.create()])

const placeholderKey = new PluginKey('composer-placeholder')
const highlightKey = new PluginKey('composer-highlight')
const trailingParagraphKey = new PluginKey('composer-trailing-paragraph')
const emptyCodeBlockKey = new PluginKey('composer-empty-code-block')

const ProseMirrorComposer = forwardRef<ComposerHandle, ComposerProps>(function ProseMirrorComposer({
  placeholder,
  onChange,
  onSend
}, ref) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onSendRef = useRef(onSend)
  const placeholderRef = useRef(placeholder)

  onChangeRef.current = onChange
  onSendRef.current = onSend
  placeholderRef.current = placeholder

  useImperativeHandle(ref, () => ({
    reset() {
      const view = viewRef.current
      if (!view) return
      const state = createEditorState(emptyDoc(), placeholderRef, onSendRef)
      view.updateState(state)
      onChangeRef.current('', false)
      requestAnimationFrame(() => {
        view.focus()
        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)))
      })
    },
    insertPlainText(text: string) {
      const view = viewRef.current
      if (!view || !text) return
      const paragraph = composerSchema.nodes.paragraph.create(null, composerSchema.text(text))
      let tr = view.state.tr.replaceSelectionWith(paragraph)
      tr = ensureTrailingParagraph(tr)
      view.dispatch(tr.scrollIntoView())
      view.focus()
    }
  }), [])

  useEffect(() => {
    if (!hostRef.current) return

    const view = new EditorView(hostRef.current, {
      state: createEditorState(emptyDoc(), placeholderRef, onSendRef),
      attributes: {
        spellcheck: 'false',
        autocorrect: 'off',
        autocapitalize: 'off'
      },
      dispatchTransaction(transaction) {
        const nextState = view.state.apply(transaction)
        view.updateState(nextState)
        const markdown = serializeDoc(nextState.doc)
        onChangeRef.current(markdown, Boolean(markdown.trim()))
      }
    })

    viewRef.current = view
    onChangeRef.current('', false)

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch(view.state.tr.setMeta(placeholderKey, true))
  }, [placeholder])

  return <div ref={hostRef} className="pm-composer px-4 pt-3 pb-2" />
})

export default ProseMirrorComposer

function createEditorState(
  doc: ProseMirrorNode,
  placeholderRef: React.MutableRefObject<string>,
  onSendRef: React.MutableRefObject<(markdown?: string) => void>
) {
  return EditorState.create({
    doc,
    schema: composerSchema,
    plugins: [
      keymap({
        Enter: (state, dispatch) => {
          onSendRef.current(serializeDoc(state.doc))
          return true
        },
        'Shift-Enter': (state, dispatch) => {
          const { $from } = state.selection
          if ($from.parent.type === composerSchema.nodes.code_block) {
            dispatch?.(state.tr.insertText('\n').scrollIntoView())
            return true
          }
          dispatch?.(state.tr.replaceSelectionWith(composerSchema.nodes.hard_break.create()).scrollIntoView())
          return true
        },
        ArrowUp: moveFromCodeBoundary('up'),
        ArrowDown: moveFromCodeBoundary('down'),
        Backspace: replaceEmptyCodeBlock,
        Delete: replaceEmptyCodeBlock
      }),
      keymap(baseKeymap),
      pastePlugin(),
      trailingParagraphPlugin(),
      emptyCodeBlockPlugin(),
      placeholderPlugin(placeholderRef),
      highlightPlugin()
    ]
  })
}

function placeholderPlugin(placeholderRef: React.MutableRefObject<string>) {
  return new Plugin({
    key: placeholderKey,
    props: {
      decorations(state) {
        const first = state.doc.firstChild
        if (!first || first.type !== composerSchema.nodes.paragraph || first.textContent || hasDocContent(state.doc)) {
          return DecorationSet.empty
        }
        const deco = Decoration.node(0, first.nodeSize, {
          class: 'pm-placeholder',
          'data-placeholder': placeholderRef.current
        })
        return DecorationSet.create(state.doc, [deco])
      }
    }
  })
}

function hasDocContent(doc: ProseMirrorNode) {
  let hasContent = false
  doc.descendants(node => {
    if (node.isText && Boolean(node.textContent.trim())) {
      hasContent = true
      return false
    }
    return !hasContent
  })
  return hasContent
}

function highlightPlugin() {
  return new Plugin({
    key: highlightKey,
    props: {
      decorations(state) {
        const decorations: Decoration[] = []
        state.doc.descendants((node, pos) => {
          if (node.type !== composerSchema.nodes.code_block) return true
          const text = node.textContent
          const language = node.attrs.language || inferCodeLanguage(text)
          for (const token of tokenizeCode(text, language)) {
            decorations.push(Decoration.inline(pos + 1 + token.from, pos + 1 + token.to, { class: `pm-token-${token.type}` }))
          }
          return false
        })
        return DecorationSet.create(state.doc, decorations)
      }
    }
  })
}

function pastePlugin() {
  return new Plugin({
    props: {
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain') ?? ''
        if (!text) return false

        if (isFencedCode(text) || isLikelyCode(text)) {
          event.preventDefault()
          insertCodeBlock(view, text)
          return true
        }

        event.preventDefault()
        view.dispatch(view.state.tr.insertText(text).scrollIntoView())
        return true
      }
    }
  })
}

function trailingParagraphPlugin() {
  return new Plugin({
    key: trailingParagraphKey,
    appendTransaction(_, __, newState) {
      const last = newState.doc.lastChild
      if (last?.type === composerSchema.nodes.paragraph) return null
      const tr = newState.tr.insert(newState.doc.content.size, composerSchema.nodes.paragraph.create())
      return tr
    }
  })
}

function emptyCodeBlockPlugin() {
  return new Plugin({
    key: emptyCodeBlockKey,
    appendTransaction(transactions, _, newState) {
      if (!transactions.some(tr => tr.docChanged)) return null

      let tr = newState.tr
      let changed = false
      newState.doc.descendants((node, pos) => {
        if (node.type === composerSchema.nodes.code_block && !node.textContent.trim()) {
          tr = tr.replaceWith(pos, pos + node.nodeSize, composerSchema.nodes.paragraph.create())
          changed = true
          return false
        }
        return true
      })

      return changed ? ensureTrailingParagraph(tr) : null
    }
  })
}

function insertCodeBlock(view: EditorView, rawText: string) {
  const unwrapped = unwrapFencedCode(rawText)
  const text = unwrapped.text.replace(/\r\n/g, '\n').replace(/\s+$/g, '')
  const language = unwrapped.language || inferCodeLanguage(text)
  const codeNode = composerSchema.nodes.code_block.create(
    { language },
    text ? composerSchema.text(text) : undefined
  )
  const paragraph = composerSchema.nodes.paragraph.create()
  const from = view.state.selection.from
  let tr = view.state.tr.replaceSelection(new Slice(Fragment.fromArray([codeNode, paragraph]), 0, 0))
  tr = ensureTrailingParagraph(tr)
  const codeEnd = findInsertedCodeEnd(tr.doc, from, text)
  tr = tr.setSelection(TextSelection.create(tr.doc, Math.min(codeEnd, tr.doc.content.size - 1)))
  view.dispatch(tr.scrollIntoView())
  view.focus()
}

function ensureTrailingParagraph(tr: Transaction) {
  const last = tr.doc.lastChild
  if (last?.type === composerSchema.nodes.paragraph) return tr
  return tr.insert(tr.doc.content.size, composerSchema.nodes.paragraph.create())
}

function findInsertedCodeEnd(doc: ProseMirrorNode, from: number, text: string) {
  let end = from + 1 + text.length
  doc.descendants((node, pos) => {
    if (pos < from - 1) return true
    if (node.type === composerSchema.nodes.code_block && node.textContent === text) {
      end = pos + 1 + text.length
      return false
    }
    return true
  })
  return end
}

function moveFromCodeBoundary(direction: 'up' | 'down') {
  return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    const selection = state.selection
    if (!(selection instanceof TextSelection) || !selection.empty) return false
    const { $from } = selection
    if ($from.parent.type !== composerSchema.nodes.code_block) return false

    const text = $from.parent.textContent
    const offset = $from.parentOffset
    const atBoundary = direction === 'up'
      ? !text.slice(0, offset).includes('\n')
      : !text.slice(offset).includes('\n')

    if (!atBoundary) return false

    const blockStart = $from.before()
    const blockEnd = $from.after()
    let tr = state.tr

    if (direction === 'up') {
      const before = findBlockBefore(state.doc, blockStart)
      if (before?.node.type === composerSchema.nodes.paragraph) {
        dispatch?.(tr.setSelection(TextSelection.create(state.doc, before.pos + before.node.content.size + 1)).scrollIntoView())
        return true
      }
      tr = tr.insert(blockStart, composerSchema.nodes.paragraph.create())
      dispatch?.(tr.setSelection(TextSelection.create(tr.doc, blockStart + 1)).scrollIntoView())
      return true
    }

    const after = findBlockAfter(state.doc, blockEnd)
    if (after?.node.type === composerSchema.nodes.paragraph) {
      dispatch?.(tr.setSelection(TextSelection.create(state.doc, after.pos + 1)).scrollIntoView())
      return true
    }
    tr = tr.insert(blockEnd, composerSchema.nodes.paragraph.create())
    dispatch?.(tr.setSelection(TextSelection.create(tr.doc, blockEnd + 1)).scrollIntoView())
    return true
  }
}

function replaceEmptyCodeBlock(state: EditorState, dispatch?: (tr: Transaction) => void) {
  const { $from } = state.selection
  if ($from.parent.type !== composerSchema.nodes.code_block || $from.parent.textContent.trim()) return false
  const from = $from.before()
  const to = $from.after()
  let tr = state.tr.replaceWith(from, to, composerSchema.nodes.paragraph.create())
  tr = ensureTrailingParagraph(tr)
  dispatch?.(tr.setSelection(TextSelection.create(tr.doc, from + 1)).scrollIntoView())
  return true
}

function findBlockBefore(doc: ProseMirrorNode, pos: number) {
  let result: { node: ProseMirrorNode; pos: number } | undefined
  doc.forEach((node, offset) => {
    if (node.isBlock && offset + node.nodeSize <= pos) result = { node, pos: offset }
  })
  return result
}

function findBlockAfter(doc: ProseMirrorNode, pos: number) {
  let result: { node: ProseMirrorNode; pos: number } | undefined
  doc.forEach((node, offset) => {
    if (result || !node.isBlock) return
    if (offset >= pos) result = { node, pos: offset }
  })
  return result
}

function serializeDoc(doc: ProseMirrorNode) {
  const parts: string[] = []

  doc.forEach(node => {
    if (node.type === composerSchema.nodes.code_block) {
      if (!node.textContent.trim()) return
      const lang = node.attrs.language || inferCodeLanguage(node.textContent)
      parts.push(`\`\`\`${lang}\n${node.textContent.replace(/\s+$/g, '')}\n\`\`\``)
      return
    }

    if (node.type === composerSchema.nodes.paragraph) {
      const text = serializeInline(node).trim()
      if (text) parts.push(text)
    }
  })

  return parts.join('\n\n')
}

function serializeInline(node: ProseMirrorNode) {
  const parts: string[] = []
  node.forEach(child => {
    if (child.type === composerSchema.nodes.hard_break) parts.push('\n')
    else parts.push(child.textContent)
  })
  return parts.join('')
}

function isLikelyCode(text: string) {
  const normalized = text.replace(/\r\n/g, '\n')
  const trimmed = normalized.trim()
  const lines = normalized.split('\n')
  if (lines.length < 4 && !isFencedCode(text)) return false

  if (/^\s*package\s+\w+/m.test(normalized) && /\bfunc\s+\w+\s*\(/.test(normalized)) return true
  if (/\bfunc\s+\w+\s*\([^)]*\)\s*(?:\([^)]*\)|[\w*.[\]]+)?\s*\{/.test(normalized)) return true
  if (/^\s*[{[][\s\S]*[}\]]\s*$/.test(trimmed) && /["']\w+["']\s*:/.test(normalized)) return true
  if (/^\s*(while|for|until)\b[\s\S]*\b(do|done)\b/m.test(normalized)) return true

  const codeSignals = [
    /^\s*(import|export|const|let|var|function|class|interface|type|return|if|for|while|switch|try|catch)\b/,
    /^\s*(def|async def|from\s+\S+\s+import|print\(|class\s+\w+\(|if __name__)/,
    /^\s*(package\s+\w+|func\s+\w+\s*\(|import\s+\(|defer\s+|go\s+func|type\s+\w+\s+struct)\b/,
    /^\s*(while|for|until|do|done|if|then|fi|case|esac|echo|sleep|export)\b/,
    /^\s*(<\/?[a-z][\w:-]*|#[\w-]+\s*\{|[\w.-]+\s*\{)/i,
    /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH)\b/i,
    /^\s*[{[\]}),;]+$/,
    /^\s*[})]\s*$/,
    /[{};]/
  ]
  const nonEmptyLines = lines.filter(line => line.trim())
  const signalCount = nonEmptyLines.filter(line => codeSignals.some(re => re.test(line))).length
  const indentedCount = lines.filter(line => /^\s{2,}\S/.test(line)).length
  const punctuationLines = nonEmptyLines.filter(line => /[{};]\s*$/.test(line)).length
  const signalRatio = nonEmptyLines.length ? signalCount / nonEmptyLines.length : 0

  return signalCount >= 4 || (signalCount >= 3 && signalRatio >= 0.35) || (indentedCount >= 4 && punctuationLines >= 2)
}

function inferCodeLanguage(text: string) {
  const trimmed = text.trim()
  if (/^\s*package\s+\w+/m.test(text) || /\bfunc\s+\w+\s*\([^)]*\)\s*(?:\([^)]*\)|[\w*.[\]]+)?\s*\{/.test(text)) return 'go'
  if (/^\s*#!.*\b(bash|sh|zsh)\b/.test(text) || /^\s*(while|for|until)\b[\s\S]*\b(do|done)\b/m.test(text)) return 'bash'
  if (/^\s*<[\w!]/.test(trimmed)) return 'html'
  if (/\b(import|export)\b.*\bfrom\b|function\s+\w+|const\s+\w+\s*=|=>|console\.log/.test(text)) return 'ts'
  if (/\b(def|async def|print\(|import\s+\w+|from\s+\w+\s+import)\b/.test(text)) return 'python'
  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH)\b/i.test(text)) return 'sql'
  if (/^\s*[{[]/.test(trimmed) && /["']\w+["']\s*:/.test(text)) return 'json'
  if (/\b(public|private|protected|class|interface)\b/.test(text) && /[{};]/.test(text)) return 'java'
  if (/\b(fn|let|mut|impl|pub)\b/.test(text)) return 'rust'
  if (/\.[\w-]+\s*\{|#[\w-]+\s*\{|:\s*[^;]+;/.test(text)) return 'css'
  return ''
}

function isFencedCode(text: string) {
  return /^```[\w-]*\n[\s\S]*\n```$/.test(text.trim())
}

function unwrapFencedCode(text: string) {
  const match = text.trim().match(/^```([\w-]*)\n([\s\S]*)\n```$/)
  if (!match) return { text, language: inferCodeLanguage(text) }
  return { text: match[2], language: match[1] || inferCodeLanguage(match[2]) }
}

type TokenType = 'keyword' | 'string' | 'comment' | 'number' | 'variable' | 'function' | 'property'

type Token = {
  from: number
  to: number
  type: TokenType
}

function tokenizeCode(text: string, language: string): Token[] {
  const tokens: Token[] = []

  addMatches(tokens, text, /(["'`])(?:\\.|(?!\1)[\s\S])*\1/g, 'string')
  addMatches(tokens, text, /\/\/.*|#.*|\/\*[\s\S]*?\*\//g, 'comment')
  addMatches(tokens, text, /\b\d+(?:\.\d+)?\b/g, 'number')

  if (language === 'bash' || language === 'sh' || language === 'zsh') {
    addMatches(tokens, text, /\b(?:if|then|else|elif|fi|for|while|until|do|done|case|esac|in|function|echo|sleep|export|local|return)\b/g, 'keyword')
    addMatches(tokens, text, /\$[A-Za-z_][A-Za-z0-9_]*|\$\{[^}]+\}/g, 'variable')
  } else if (language === 'go') {
    addMatches(tokens, text, /\b(?:package|import|func|var|const|type|struct|interface|return|if|else|for|range|go|defer|select|case|default|switch|map|chan)\b/g, 'keyword')
    addMatches(tokens, text, /\b([A-Za-z_][A-Za-z0-9_]*)\s*(?=\()/g, 'function')
  } else if (language === 'python') {
    addMatches(tokens, text, /\b(?:def|class|return|if|elif|else|for|while|try|except|finally|with|as|import|from|lambda|yield|async|await|None|True|False)\b/g, 'keyword')
    addMatches(tokens, text, /\b([A-Za-z_][A-Za-z0-9_]*)\s*(?=\()/g, 'function')
  } else if (language === 'json') {
    addMatches(tokens, text, /"(?:\\.|[^"\\])*"(?=\s*:)/g, 'property')
    addMatches(tokens, text, /\b(?:true|false|null)\b/g, 'keyword')
  } else if (language === 'html' || language === 'xml') {
    addMatches(tokens, text, /<\/?[A-Za-z][\w:-]*|\/?>/g, 'keyword')
    addMatches(tokens, text, /\b[A-Za-z_:][\w:.-]*(?==)/g, 'property')
  } else if (language === 'css') {
    addMatches(tokens, text, /#[\w-]+|\.[\w-]+|@[\w-]+/g, 'keyword')
    addMatches(tokens, text, /\b[\w-]+(?=\s*:)/g, 'property')
  } else if (language === 'sql') {
    addMatches(tokens, text, /\b(?:SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|ALTER|DROP|JOIN|LEFT|RIGHT|INNER|OUTER|GROUP|ORDER|BY|HAVING|LIMIT|VALUES|SET|AND|OR|NULL|AS)\b/gi, 'keyword')
  } else {
    addMatches(tokens, text, /\b(?:import|export|from|const|let|var|function|class|interface|type|return|if|else|for|while|switch|case|break|continue|try|catch|finally|async|await|new|extends|implements|public|private|protected|static|true|false|null|undefined)\b/g, 'keyword')
    addMatches(tokens, text, /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*(?=\()/g, 'function')
  }

  return tokens.sort((a, b) => a.from - b.from)
}

function addMatches(tokens: Token[], text: string, regex: RegExp, type: TokenType) {
  for (const match of text.matchAll(regex)) {
    const from = match.index ?? 0
    const value = match[1] && match[0].includes(match[1]) ? match[1] : match[0]
    const start = match[1] && match[0] !== match[1] ? match[0].indexOf(match[1]) : 0
    const to = from + start + value.length
    const adjustedFrom = from + start
    if (adjustedFrom >= to || tokens.some(token => adjustedFrom < token.to && to > token.from)) continue
    tokens.push({ from: adjustedFrom, to, type })
  }
}

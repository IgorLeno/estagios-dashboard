"use client"

import { cn } from "@/lib/utils"

interface MarkdownPreviewProps {
  content: string
  editable?: boolean
  onChange?: (content: string) => void
  className?: string
}

/**
 * Component para preview de Markdown com formatação visual bonita
 * Aplica CSS customizado para títulos, listas, links, etc.
 * Similar ao GitHub Markdown ou Notion
 */
export function MarkdownPreview({ content, editable = false, onChange, className }: MarkdownPreviewProps) {
  if (editable) {
    return (
      <textarea
        value={content}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label="Markdown content"
        placeholder="Digite seu conteúdo em Markdown aqui..."
        className={cn(
          "w-full min-h-[500px] p-4 rounded-lg border border-border",
          "bg-card text-foreground font-mono text-sm leading-relaxed",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
          "resize-y markdown-preview-editable",
          className
        )}
      />
    )
  }

  // Preview mode - render HTML from markdown
  return (
    <div
      className={cn(
        "markdown-preview",
        "p-6 rounded-lg border border-border bg-card",
        "text-foreground break-words overflow-wrap-anywhere",
        "overflow-x-hidden overflow-y-auto",
        "w-full max-w-full min-w-0",
        "[&_*]:break-words [&_*]:max-w-full",
        className
      )}
      dangerouslySetInnerHTML={{ __html: renderMarkdownToHTML(content) }}
    />
  )
}

/**
 * Converte Markdown simples para HTML com formatação básica
 * Garante que TODO texto seja envolvido em elementos HTML (nunca text nodes soltos)
 */
function renderMarkdownToHTML(markdown: string): string {
  const lines = markdown.split('\n')
  const result: string[] = []
  let paragraphLines: string[] = []

  function applyInlineFormatting(text: string): string {
    let formatted = text
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="markdown-strong">$1</strong>')
    formatted = formatted.replace(/\*(.+?)\*/g, '<em class="markdown-em">$1</em>')
    formatted = formatted.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="markdown-link" target="_blank" rel="noopener">$1</a>')
    formatted = formatted.replace(/`(.+?)`/g, '<code class="markdown-code">$1</code>')
    return formatted
  }

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      const content = applyInlineFormatting(paragraphLines.join(' ').trim())
      result.push(`<p class="markdown-p">${content}</p>`)
      paragraphLines = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Empty line - end current paragraph
    if (trimmed === '') {
      flushParagraph()
      continue
    }

    // H1
    if (trimmed.startsWith('# ')) {
      flushParagraph()
      result.push(`<h1 class="markdown-h1">${trimmed.slice(2)}</h1>`)
      continue
    }

    // H2
    if (trimmed.startsWith('## ')) {
      flushParagraph()
      result.push(`<h2 class="markdown-h2">${trimmed.slice(3)}</h2>`)
      continue
    }

    // H3
    if (trimmed.startsWith('### ')) {
      flushParagraph()
      result.push(`<h3 class="markdown-h3">${trimmed.slice(4)}</h3>`)
      continue
    }

    // List item
    if (trimmed.startsWith('- ')) {
      flushParagraph()
      const content = applyInlineFormatting(trimmed.slice(2))
      result.push(`<li class="markdown-li">${content}</li>`)
      continue
    }

    // Regular text - accumulate in paragraph
    paragraphLines.push(trimmed)
  }

  // Flush any remaining paragraph
  flushParagraph()

  // Wrap consecutive <li> in <ul>
  let html = result.join('')
  html = html.replace(/(<li class="markdown-li">.*?<\/li>)+/gs, match => {
    return `<ul class="markdown-ul">${match}</ul>`
  })

  return html
}

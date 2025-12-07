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
 * Não usa biblioteca externa para manter simplicidade
 */
function renderMarkdownToHTML(markdown: string): string {
  let html = markdown

  // H1 - Títulos principais
  html = html.replace(/^# (.+)$/gm, '<h1 class="markdown-h1">$1</h1>')

  // H2 - Títulos de seção
  html = html.replace(/^## (.+)$/gm, '<h2 class="markdown-h2">$1</h2>')

  // H3 - Subtítulos
  html = html.replace(/^### (.+)$/gm, '<h3 class="markdown-h3">$1</h3>')

  // Negrito
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="markdown-strong">$1</strong>')

  // Itálico
  html = html.replace(/\*(.+?)\*/g, '<em class="markdown-em">$1</em>')

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="markdown-link" target="_blank" rel="noopener">$1</a>')

  // Listas não ordenadas
  html = html.replace(/^- (.+)$/gm, '<li class="markdown-li">$1</li>')
  html = html.replace(/(<li class="markdown-li">.*<\/li>)/s, '<ul class="markdown-ul">$1</ul>')

  // Code inline
  html = html.replace(/`(.+?)`/g, '<code class="markdown-code">$1</code>')

  // Quebras de linha duplas = parágrafo
  html = html.replace(/\n\n/g, '</p><p class="markdown-p">')
  html = `<p class="markdown-p">${html}</p>`

  // Limpar tags vazias
  html = html.replace(/<p class="markdown-p"><\/p>/g, "")

  return html
}

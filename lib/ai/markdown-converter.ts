import TurndownService from "turndown"
import { marked } from "marked"
import type { ResumeTemplate } from "./resume-html-template"

/**
 * Converte HTML para Markdown com formatação visual similar ao PDF final.
 *
 * Este converter aplica regras customizadas para que o Markdown gerado
 * seja visualmente legível e se pareça com o currículo final, facilitando
 * a edição pelo usuário.
 *
 * O Markdown é APENAS para preview/edição - a formatação real (CSS, espaçamento)
 * fica no HTML final gerado por wrapMarkdownAsHTML().
 */
export function htmlToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: "atx", // Use # para títulos
    bulletListMarker: "-", // Use - para listas
    codeBlockStyle: "fenced", // Use ``` para code blocks
    emDelimiter: "*", // Use * para itálico
    strongDelimiter: "**", // Use ** para negrito
  })

  // ✅ REGRAS CUSTOMIZADAS PARA CURRÍCULO

  // 1. Preservar quebras de linha (importante para contatos)
  turndownService.addRule("lineBreaks", {
    filter: "br",
    replacement: () => "  \n", // Markdown line break (2 espaços + \n)
  })

  // 2. Manter links de email formatados
  turndownService.addRule("emailLinks", {
    filter: (node) => {
      if (node.nodeName !== "A") return false
      const href = (node as HTMLAnchorElement).href
      return href?.startsWith("mailto:")
    },
    replacement: (content, node) => {
      const href = (node as HTMLAnchorElement).href
      const email = href.replace("mailto:", "")
      return `[${content}](mailto:${email})`
    },
  })

  // 3. Remover divs e spans desnecessários, manter conteúdo
  turndownService.addRule("divToNothing", {
    filter: (node) => node.nodeName === "DIV" || node.nodeName === "SPAN",
    replacement: (content) => content,
  })

  // 4. Negrito para títulos de experiência/educação
  turndownService.addRule("strongTitles", {
    filter: "strong",
    replacement: (content) => `**${content}**`,
  })

  // 5. Itálico para datas e complementos
  turndownService.addRule("italicDates", {
    filter: "em",
    replacement: (content) => `*${content}*`,
  })

  // 6. Melhorar formatação de listas
  turndownService.addRule("betterLists", {
    filter: ["ul", "ol"],
    replacement: (content) => `\n${content}\n`,
  })

  // 7. Garantir espaçamento adequado em parágrafos
  turndownService.addRule("paragraphSpacing", {
    filter: "p",
    replacement: (content) => {
      if (!content.trim()) return ""
      return `${content}\n\n`
    },
  })

  // 8. Melhorar formatação de títulos H2
  turndownService.addRule("h2Spacing", {
    filter: "h2",
    replacement: (content) => {
      if (!content.trim()) return ""
      return `\n## ${content.toUpperCase()}\n\n`
    },
  })

  // 9. Melhorar formatação de títulos H3
  turndownService.addRule("h3Spacing", {
    filter: "h3",
    replacement: (content) => {
      if (!content.trim()) return ""
      return `\n### ${content}\n\n`
    },
  })

  try {
    console.log("[MarkdownConverter] Converting HTML to Markdown")

    // ✅ PRÉ-PROCESSAMENTO: Remover estrutura HTML e CSS
    // Remove tags estruturais (<html>, <head>, <style>, etc.) para que
    // o preview Markdown mostre apenas o conteúdo relevante ao usuário
    const cleanedHtml = html
      .replace(/<!DOCTYPE[^>]*>/gi, "") // Remove <!DOCTYPE ...>
      .replace(/<\?xml[^>]*>/gi, "") // Remove <?xml ...>
      .replace(/<html[^>]*>/gi, "") // Remove tag <html ...>
      .replace(/<\/html>/gi, "") // Remove tag </html>
      .replace(/<head[\s\S]*?<\/head>/gi, "") // Remove <head>...</head>
      .replace(/<style[\s\S]*?<\/style>/gi, "") // Remove blocos <style>...</style>
      .replace(/<script[\s\S]*?<\/script>/gi, "") // Remove blocos <script>...</script>
      .replace(/<body[^>]*>/gi, "") // Remove tag <body ...>
      .replace(/<\/body>/gi, "") // Remove tag </body>
      .replace(/<meta[^>]*>/gi, "") // Remove tags <meta ...>
      .replace(/<link[^>]*>/gi, "") // Remove tags <link ...>
      .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "") // Remove <title>...</title>

    let markdown = turndownService.turndown(cleanedHtml)

    // ✅ PÓS-PROCESSAMENTO: Limpeza e formatação visual
    markdown = cleanupMarkdown(markdown)

    console.log("[MarkdownConverter] ✅ Conversion successful, length:", markdown.length)
    return markdown
  } catch (error) {
    console.error("[MarkdownConverter] Error converting HTML to Markdown:", error)
    throw error
  }
}

/**
 * Limpa e formata o Markdown gerado para melhor visualização.
 *
 * Remove espaços extras, normaliza quebras de linha, e garante
 * formatação consistente para que o Markdown seja legível e se
 * pareça com o currículo final.
 */
function cleanupMarkdown(markdown: string): string {
  let cleaned = markdown

  // 1. Remover espaços em branco extras (mais de 2 quebras de linha)
  cleaned = cleaned.replace(/\n\n\n+/g, "\n\n")

  // 2. Limpar espaços em branco no final das linhas (exceto line breaks de 2 espaços)
  cleaned = cleaned
    .split("\n")
    .map((line) => {
      // Preservar line breaks do Markdown (2 espaços + \n)
      if (line.endsWith("  ")) return line
      return line.trimEnd()
    })
    .join("\n")

  // 3. Remover múltiplos espaços em branco dentro de linhas
  cleaned = cleaned.replace(/ {2,}/g, " ")

  // 4. Garantir espaçamento consistente após títulos H1
  cleaned = cleaned.replace(/^(# .+)\n([^\n])/gm, "$1\n\n$2")

  // 5. Garantir espaçamento consistente após títulos H2
  cleaned = cleaned.replace(/^(## .+)\n([^\n])/gm, "$1\n\n$2")

  // 6. Garantir espaçamento consistente após títulos H3
  cleaned = cleaned.replace(/^(### .+)\n([^\n])/gm, "$1\n\n$2")

  // 7. Remover múltiplas quebras de linha antes de títulos
  cleaned = cleaned.replace(/\n{3,}(#)/g, "\n\n$1")

  // 8. Garantir que listas tenham espaço antes e depois
  cleaned = cleaned.replace(/([^\n])\n(- )/g, "$1\n\n$2")
  cleaned = cleaned.replace(/(- .+)\n([^-\n])/g, "$1\n\n$2")

  // 9. Remover espaço extra no início e fim do documento
  cleaned = cleaned.trim()

  // 10. Garantir que markdown termina com quebra de linha
  if (!cleaned.endsWith("\n")) {
    cleaned += "\n"
  }

  console.log("[MarkdownConverter] ✅ Cleanup completed")
  return cleaned
}

/**
 * Converte Markdown para HTML.
 *
 * Usa marked para converter Markdown simples em HTML semanticamente correto.
 * O HTML gerado será depois envolto com CSS via wrapMarkdownAsHTML().
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  try {
    console.log("[MarkdownConverter] Converting Markdown to HTML")

    marked.setOptions({
      breaks: true, // Quebras de linha viram <br>
      gfm: true, // GitHub Flavored Markdown
    })

    const html = await marked(markdown)
    console.log("[MarkdownConverter] ✅ Conversion successful, length:", html.length)
    return html
  } catch (error) {
    console.error("[MarkdownConverter] Error converting Markdown to HTML:", error)
    throw error
  }
}

/**
 * Envolve HTML gerado do Markdown com CSS e estrutura HTML completa.
 *
 * IMPORTANTE: Esta função NÃO modifica o conteúdo - apenas adiciona
 * formatação CSS consistente com o design original do currículo.
 *
 * O CSS aqui é a formatação REAL que será aplicada no PDF final.
 */
function getResumeTemplateStyles(template: ResumeTemplate): string {
  if (template === "modelo2") {
    return `
        @page { size: A4; margin: 40px; }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10.5pt;
            line-height: 1.35;
            color: #000;
            background: #fff;
            padding: 0;
            margin: 0;
            -webkit-print-color-adjust: exact;
        }

        .container {
            width: 100%;
            max-width: 100%;
        }

        h1 {
            font-family: Georgia, serif;
            font-size: 24pt;
            font-weight: 700;
            line-height: 1.05;
            color: #000;
            margin-bottom: 6pt;
        }

        h1 + p {
            color: #2E6FA3;
            font-size: 12.5pt;
            font-weight: 500;
            line-height: 1.25;
            margin-bottom: 6pt;
            text-align: left;
        }

        h1 + p + p {
            color: #5a5a5a;
            font-size: 10pt;
            line-height: 1.35;
            margin-bottom: 12pt;
            text-align: left;
        }

        h2 {
            color: #2E5C9E;
            font-size: 10pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            border-bottom: 1.5pt solid #2E5C9E;
            padding-bottom: 2pt;
            margin-top: 12pt;
            margin-bottom: 8pt;
            page-break-after: avoid;
            break-after: avoid;
        }

        h3 {
            font-size: 11pt;
            font-weight: 700;
            margin-top: 8pt;
            margin-bottom: 3pt;
        }

        p {
            margin-bottom: 5pt;
            font-size: 10.5pt;
            line-height: 1.4;
        }

        ul, ol {
            list-style: none;
            margin: 0 0 4pt 0;
            padding: 0;
        }

        li {
            list-style: none;
            padding-left: 0;
            margin-bottom: 4pt;
            font-size: 10.5pt;
            line-height: 1.35;
        }

        li::before {
            content: none;
        }

        strong {
            font-weight: 700;
            color: #000;
        }

        em {
            font-style: italic;
            color: #2E5C9E;
        }

        a {
            color: #2E5C9E;
            text-decoration: none;
        }

        h1 + p + p a {
            color: inherit;
            text-decoration: none;
        }

        @media screen {
            body { padding: 40px; }
        }

        @media print {
            body { padding: 0; }
        }
    `
  }

  return `
        @page {
            size: A4;
            margin: 1.94cm 2.25cm 0.49cm 2.25cm;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Calibri, Arial, "Segoe UI", sans-serif;
            font-size: 11pt;
            line-height: 1.3;
            color: #000;
            background: #fff;
            padding: 0;
            margin: 0;
            -webkit-print-color-adjust: exact;
        }

        .container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
        }

        h1 {
            text-align: left;
            font-size: 14pt;
            font-weight: 700;
            margin-bottom: 3pt;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
            color: #000;
        }

        h2 {
            font-size: 11pt;
            font-weight: 700;
            text-transform: uppercase;
            margin-top: 6pt;
            margin-bottom: 5pt;
            padding-bottom: 2pt;
            letter-spacing: 0.3pt;
            color: #000;
            border-bottom: 1.5pt solid #000;
            page-break-after: avoid;
            break-after: avoid;
        }

        h3 {
            font-size: 11pt;
            font-weight: 700;
            margin-top: 8pt;
            margin-bottom: 3pt;
        }

        p {
            margin-bottom: 4pt;
            text-align: justify;
            font-size: 11pt;
            line-height: 1.25;
            color: #000;
        }

        ul, ol {
            margin-left: 0;
            margin-bottom: 4pt;
            padding-left: 0;
            list-style-position: outside;
            list-style-type: none;
        }

        li {
            margin-bottom: 3pt;
            padding-left: 12pt;
            line-height: 1.25;
            font-size: 11pt;
            color: #000;
            text-align: justify;
            position: relative;
        }

        li::before {
            content: "• ";
            position: absolute;
            left: 0;
            font-weight: 700;
        }

        strong {
            font-weight: 700;
            color: #000;
        }

        em {
            font-style: italic;
        }

        a {
            color: #0066cc;
            text-decoration: underline;
        }

        a:hover {
            color: #004499;
            text-decoration: underline;
        }

        @media screen {
            body { padding: 1.94cm 2.25cm 1.94cm 2.25cm; }
        }

        @media print {
            body { padding: 0; }
        }
    `
}

export function wrapMarkdownAsHTML(
  markdownHtml: string,
  template: ResumeTemplate = "modelo1",
  language: "pt" | "en" = "pt"
): string {
  return `
<!DOCTYPE html>
<html lang="${language === "pt" ? "pt-BR" : "en"}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Currículo</title>
    <style>
${getResumeTemplateStyles(template)}
    </style>
</head>
<body>
    <div class="container">
        ${markdownHtml}
    </div>
</body>
</html>
  `
}

export async function renderMarkdownResumeToHtml(
  markdown: string,
  template: ResumeTemplate = "modelo1",
  language: "pt" | "en" = "pt"
): Promise<string> {
  const html = await markdownToHtml(markdown)
  return wrapMarkdownAsHTML(html, template, language)
}

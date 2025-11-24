/**
 * Valida e abre URLs de forma segura
 * Apenas permite protocolos http/https e valida origens confiáveis
 */

/**
 * Valida se uma URL é segura para abrir
 * @param urlString - A URL a ser validada
 * @param allowedOrigins - Lista de origens permitidas (opcional). Se não fornecido, aceita qualquer origem HTTPS/HTTP
 * @returns true se a URL é segura, false caso contrário
 */
export function isValidUrl(urlString: string | null | undefined, allowedOrigins?: string[]): boolean {
  if (!urlString || typeof urlString !== "string") {
    return false
  }

  try {
    const url = new URL(urlString)

    // Apenas permite protocolos http e https
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false
    }

    if (allowedOrigins && allowedOrigins.length > 0) {
      const origin = url.origin
      return allowedOrigins.some(
        (allowed) => origin === allowed || origin === `https://${allowed}` || origin === `http://${allowed}`
      )
    }

    // Caso contrário, aceita qualquer URL HTTP/HTTPS
    return true
  } catch (error) {
    // URL inválida
    return false
  }
}

/**
 * Verifica se uma URL é do Supabase Storage
 * @param urlString - A URL a ser verificada
 * @returns true se a URL é do Supabase Storage
 */
export function isSupabaseStorageUrl(urlString: string | null | undefined): boolean {
  if (!urlString) {
    return false
  }

  try {
    const url = new URL(urlString)
    // Supabase Storage URLs seguem o padrão: https://<project-id>.supabase.co/storage/v1/object/public/<bucket>/<path>
    return (
      url.pathname.includes("/storage/v1/object/public/") &&
      (url.hostname.includes(".supabase.co") || url.hostname.includes(".supabase.io"))
    )
  } catch (error) {
    return false
  }
}

/**
 * Abre uma URL de forma segura em uma nova aba
 * @param urlString - A URL a ser aberta
 * @param allowedOrigins - Lista de origens permitidas (opcional)
 * @returns true se a URL foi aberta com sucesso, false caso contrário
 */
export function safeOpenUrl(urlString: string | null | undefined, allowedOrigins?: string[]): boolean {
  if (!isValidUrl(urlString, allowedOrigins)) {
    console.error("URL inválida ou não permitida:", urlString)
    return false
  }

  // Após validação, sabemos que urlString é uma string válida
  if (!urlString) {
    return false
  }

  try {
    // Cria um elemento anchor temporário com rel="noopener noreferrer" para segurança
    // Este método é mais seguro que window.open pois garante explicitamente os atributos de segurança
    const anchor = document.createElement("a")
    anchor.href = urlString
    anchor.target = "_blank"
    anchor.rel = "noopener noreferrer"
    anchor.style.display = "none"

    // Adiciona ao DOM temporariamente
    document.body.appendChild(anchor)

    // Simula o clique para abrir a URL
    anchor.click()

    // Remove o elemento após um pequeno delay para garantir que o clique foi processado
    setTimeout(() => {
      try {
        if (anchor.parentNode) {
          document.body.removeChild(anchor)
        }
      } catch (removeError) {
        // Ignora erros ao remover o elemento (pode já ter sido removido)
      }
    }, 0)

    return true
  } catch (error) {
    console.error("Erro ao abrir URL:", error)
    return false
  }
}

/**
 * Verifica se uma string é um data URI (Base64)
 * @param urlString - String a ser verificada
 * @returns true se for um data URI
 */
export function isDataUri(urlString: string | null | undefined): boolean {
  if (!urlString || typeof urlString !== "string") {
    return false
  }
  return urlString.startsWith("data:")
}

/**
 * Faz download de um PDF a partir de um data URI
 * @param dataUri - Data URI contendo o PDF em Base64
 * @param filename - Nome do arquivo para download
 * @returns true se o download foi iniciado com sucesso
 */
export function downloadPdfFromDataUri(dataUri: string, filename: string = "document.pdf"): boolean {
  try {
    if (!isDataUri(dataUri)) {
      console.error("String fornecida não é um data URI válido")
      return false
    }

    // Cria elemento anchor temporário para download
    const link = document.createElement("a")
    link.href = dataUri
    link.download = filename
    link.style.display = "none"

    // Adiciona ao DOM temporariamente
    document.body.appendChild(link)

    // Simula clique para iniciar download
    link.click()

    // Remove elemento após download
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link)
        }
      } catch (removeError) {
        // Ignora erros ao remover elemento
      }
    }, 0)

    return true
  } catch (error) {
    console.error("Erro ao fazer download do PDF:", error)
    return false
  }
}

/**
 * Abre uma URL do Supabase Storage de forma segura
 * Valida especificamente se a URL é do Supabase Storage antes de abrir
 * @param urlString - A URL a ser aberta
 * @returns true se a URL foi aberta com sucesso, false caso contrário
 */
export function safeOpenSupabaseStorageUrl(urlString: string | null | undefined): boolean {
  if (!isSupabaseStorageUrl(urlString)) {
    console.error("URL não é do Supabase Storage:", urlString)
    return false
  }

  return safeOpenUrl(urlString)
}

/**
 * Faz download de um PDF de forma inteligente
 * Detecta automaticamente se é data URI ou URL do Supabase Storage
 * @param urlOrDataUri - URL do Supabase Storage ou data URI
 * @param filename - Nome do arquivo (usado apenas para data URIs)
 * @returns true se a operação foi bem-sucedida
 */
export function downloadPdf(urlOrDataUri: string | null | undefined, filename: string = "document.pdf"): boolean {
  if (!urlOrDataUri) {
    console.error("URL ou data URI não fornecido")
    return false
  }

  // Se for data URI, faz download direto
  if (isDataUri(urlOrDataUri)) {
    return downloadPdfFromDataUri(urlOrDataUri, filename)
  }

  // Se for URL do Supabase Storage, abre em nova aba
  if (isSupabaseStorageUrl(urlOrDataUri)) {
    return safeOpenSupabaseStorageUrl(urlOrDataUri)
  }

  console.error("URL inválida: não é nem data URI nem URL do Supabase Storage:", urlOrDataUri)
  return false
}

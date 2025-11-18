/**
 * Rate limiter para Gemini API
 * Suporta limites de requests/minuto e tokens/dia
 * Implementações: in-memory (single-instance) e Redis (production)
 *
 * Free tier Gemini: 15 req/min, 1M tokens/dia
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface RateLimitCheckResult {
  allowed: boolean
  remaining: {
    requests: number
    tokens: number
  }
  resetTime: {
    requests: number // timestamp em ms
    tokens: number // timestamp em ms (próximo reset diário)
  }
  limit: {
    requests: number
    tokens: number
  }
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

// ============================================================================
// Configuration
// ============================================================================

export const RATE_LIMIT_CONFIG = {
  // Requests per minute (default: 15 para free tier)
  maxRequestsPerMin: parseInt(
    process.env.GOOGLE_API_RATE_LIMIT_PER_MIN || '15',
    10
  ),
  // Tokens per day (default: 1M para free tier)
  maxTokensPerDay: parseInt(
    process.env.GOOGLE_API_RATE_LIMIT_TOKENS_PER_DAY || '1000000',
    10
  ),
  // Redis configuration (optional)
  redisUrl: process.env.REDIS_URL,
  redisEnabled: !!process.env.REDIS_URL,
} as const

// ============================================================================
// Storage Interface (Strategy Pattern)
// ============================================================================

interface RateLimitStorage {
  // Request tracking
  getRequestCount(identifier: string, windowStart: number): Promise<number>
  incrementRequest(identifier: string, windowStart: number, ttl: number): Promise<number>
  
  // Token tracking
  getTokenCount(identifier: string, dayKey: string): Promise<number>
  incrementTokens(identifier: string, dayKey: string, tokens: number, ttl: number): Promise<number>
  
  // Cleanup
  cleanup(): Promise<void>
}

// ============================================================================
// In-Memory Storage (Default)
// ============================================================================

interface InMemoryEntry {
  requests: Map<number, number> // windowStart -> count
  tokens: Map<string, number> // dayKey -> total tokens
}

class InMemoryStorage implements RateLimitStorage {
  private store = new Map<string, InMemoryEntry>()
  private lastCleanup = Date.now()
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutos

  private getOrCreateEntry(identifier: string): InMemoryEntry {
    let entry = this.store.get(identifier)
    if (!entry) {
      entry = {
        requests: new Map(),
        tokens: new Map(),
      }
      this.store.set(identifier, entry)
    }
    return entry
  }

  async getRequestCount(identifier: string, windowStart: number): Promise<number> {
    this.maybeCleanup()
    const entry = this.getOrCreateEntry(identifier)
    return entry.requests.get(windowStart) || 0
  }

  async incrementRequest(
    identifier: string,
    windowStart: number,
    _ttl: number
  ): Promise<number> {
    this.maybeCleanup()
    const entry = this.getOrCreateEntry(identifier)
    const current = entry.requests.get(windowStart) || 0
    entry.requests.set(windowStart, current + 1)
    return current + 1
  }

  async getTokenCount(identifier: string, dayKey: string): Promise<number> {
    this.maybeCleanup()
    const entry = this.getOrCreateEntry(identifier)
    return entry.tokens.get(dayKey) || 0
  }

  async incrementTokens(
    identifier: string,
    dayKey: string,
    tokens: number,
    _ttl: number
  ): Promise<number> {
    this.maybeCleanup()
    const entry = this.getOrCreateEntry(identifier)
    const current = entry.tokens.get(dayKey) || 0
    entry.tokens.set(dayKey, current + tokens)
    return current + tokens
  }

  async cleanup(): Promise<void> {
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    const oneMinMs = 60 * 1000

    for (const [identifier, entry] of this.store.entries()) {
      // Cleanup expired request windows (older than 1 minute)
      for (const [windowStart] of entry.requests.entries()) {
        if (now - windowStart > oneMinMs) {
          entry.requests.delete(windowStart)
        }
      }

      // Cleanup expired token entries (older than 1 day)
      for (const [dayKey] of entry.tokens.entries()) {
        // dayKey format: "YYYY-MM-DD"
        const dayDate = new Date(dayKey + 'T00:00:00Z')
        if (now - dayDate.getTime() > oneDayMs) {
          entry.tokens.delete(dayKey)
        }
      }

      // Remove entry if empty
      if (entry.requests.size === 0 && entry.tokens.size === 0) {
        this.store.delete(identifier)
      }
    }
  }

  private maybeCleanup(): void {
    const now = Date.now()
    if (now - this.lastCleanup > this.CLEANUP_INTERVAL_MS) {
      this.cleanup()
      this.lastCleanup = now
    }
  }
}

// ============================================================================
// Redis Storage (Production)
// ============================================================================

class RedisStorage implements RateLimitStorage {
  private client: any // Redis client (lazy-loaded)
  private initialized = false

  private async getClient(): Promise<any> {
    if (this.initialized && this.client) {
      return this.client
    }

    try {
      // Dynamic import para evitar erro se Redis não estiver instalado
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const redis = require('redis')
      this.client = redis.createClient({ url: RATE_LIMIT_CONFIG.redisUrl })
      await this.client.connect()
      this.initialized = true
      return this.client
    } catch (error) {
      console.error('[Rate Limiter] Redis connection failed, falling back to in-memory:', error)
      throw error
    }
  }

  async getRequestCount(identifier: string, windowStart: number): Promise<number> {
    const client = await this.getClient()
    const key = `rate-limit:requests:${identifier}:${windowStart}`
    const count = await client.get(key)
    return count ? parseInt(count, 10) : 0
  }

  async incrementRequest(
    identifier: string,
    windowStart: number,
    ttl: number
  ): Promise<number> {
    const client = await this.getClient()
    const key = `rate-limit:requests:${identifier}:${windowStart}`
    const count = await client.incr(key)
    
    // Set TTL apenas na primeira vez (quando count === 1)
    if (count === 1) {
      await client.expire(key, Math.ceil(ttl / 1000))
    }
    
    return count
  }

  async getTokenCount(identifier: string, dayKey: string): Promise<number> {
    const client = await this.getClient()
    const key = `rate-limit:tokens:${identifier}:${dayKey}`
    const count = await client.get(key)
    return count ? parseInt(count, 10) : 0
  }

  async incrementTokens(
    identifier: string,
    dayKey: string,
    tokens: number,
    ttl: number
  ): Promise<number> {
    const client = await this.getClient()
    const key = `rate-limit:tokens:${identifier}:${dayKey}`
    const count = await client.incrBy(key, tokens)
    
    // Set TTL apenas na primeira vez (quando count === tokens)
    if (count === tokens) {
      await client.expire(key, Math.ceil(ttl / 1000))
    }
    
    return count
  }

  async cleanup(): Promise<void> {
    // Redis gerencia TTL automaticamente, não precisa de cleanup manual
  }
}

// ============================================================================
// Storage Factory
// ============================================================================

let storageInstance: RateLimitStorage | null = null

function getStorage(): RateLimitStorage {
  if (storageInstance) {
    return storageInstance
  }

  if (RATE_LIMIT_CONFIG.redisEnabled && RATE_LIMIT_CONFIG.redisUrl) {
    try {
      storageInstance = new RedisStorage()
      console.log('[Rate Limiter] Using Redis storage')
    } catch (error) {
      console.warn('[Rate Limiter] Redis initialization failed, using in-memory storage:', error)
      storageInstance = new InMemoryStorage()
    }
  } else {
    storageInstance = new InMemoryStorage()
    console.log('[Rate Limiter] Using in-memory storage')
  }

  return storageInstance
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Calcula o início da janela de 1 minuto para requests
 */
function getRequestWindowStart(now: number): number {
  return Math.floor(now / 60000) * 60000 // Arredonda para o minuto mais próximo
}

/**
 * Calcula a chave do dia para tokens (formato: YYYY-MM-DD)
 */
function getDayKey(now: number): string {
  const date = new Date(now)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Calcula o timestamp do próximo reset diário (meia-noite UTC)
 */
function getNextDayReset(now: number): number {
  const date = new Date(now)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.getTime()
}

/**
 * Verifica se uma requisição pode ser feita (sem consumir o budget)
 * @param identifier - Identificador único (ex: IP address)
 * @returns Resultado da verificação com informações de limite
 */
export async function checkRateLimit(
  identifier: string
): Promise<RateLimitCheckResult> {
  const now = Date.now()
  const storage = getStorage()

  // Validar identifier
  if (typeof identifier !== 'string' || identifier.trim() === '') {
    console.warn('[Rate Limiter] Invalid identifier provided')
    return {
      allowed: false,
      remaining: { requests: 0, tokens: 0 },
      resetTime: {
        requests: now,
        tokens: now,
      },
      limit: {
        requests: RATE_LIMIT_CONFIG.maxRequestsPerMin,
        tokens: RATE_LIMIT_CONFIG.maxTokensPerDay,
      },
    }
  }

  // Verificar limite de requests
  const requestWindowStart = getRequestWindowStart(now)
  const requestCount = await storage.getRequestCount(identifier, requestWindowStart)
  const requestResetTime = requestWindowStart + 60000 // Próximo minuto
  const requestsAllowed = requestCount < RATE_LIMIT_CONFIG.maxRequestsPerMin

  // Verificar limite de tokens
  const dayKey = getDayKey(now)
  const tokenCount = await storage.getTokenCount(identifier, dayKey)
  const tokenResetTime = getNextDayReset(now)
  const tokensAllowed = tokenCount < RATE_LIMIT_CONFIG.maxTokensPerDay

  const allowed = requestsAllowed && tokensAllowed

  return {
    allowed,
    remaining: {
      requests: Math.max(0, RATE_LIMIT_CONFIG.maxRequestsPerMin - requestCount),
      tokens: Math.max(0, RATE_LIMIT_CONFIG.maxTokensPerDay - tokenCount),
    },
    resetTime: {
      requests: requestResetTime,
      tokens: tokenResetTime,
    },
    limit: {
      requests: RATE_LIMIT_CONFIG.maxRequestsPerMin,
      tokens: RATE_LIMIT_CONFIG.maxTokensPerDay,
    },
  }
}

/**
 * Consome um request do budget (deve ser chamado após verificação)
 * @param identifier - Identificador único
 * @returns Novo count de requests na janela atual
 */
export async function consumeRequest(identifier: string): Promise<number> {
  const now = Date.now()
  const storage = getStorage()
  const requestWindowStart = getRequestWindowStart(now)
  const ttl = 60000 // 1 minuto em ms

  return await storage.incrementRequest(identifier, requestWindowStart, ttl)
}

/**
 * Consome tokens do budget (deve ser chamado após a requisição ao Gemini)
 * @param identifier - Identificador único
 * @param tokens - Número de tokens consumidos
 * @returns Novo total de tokens no dia atual
 */
export async function consumeTokens(
  identifier: string,
  tokens: number
): Promise<number> {
  const now = Date.now()
  const storage = getStorage()
  const dayKey = getDayKey(now)
  const ttl = getNextDayReset(now) - now // Tempo até meia-noite

  return await storage.incrementTokens(identifier, dayKey, tokens, ttl)
}

/**
 * Limpa entradas expiradas (útil para manutenção periódica)
 */
export async function cleanupExpiredEntries(): Promise<void> {
  const storage = getStorage()
  await storage.cleanup()
}

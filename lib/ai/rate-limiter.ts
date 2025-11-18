/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 *
 * NOTE: This implementation is designed for serverless/edge runtimes.
 * Module-level setInterval is unsafe in these environments as it prevents
 * proper function termination and may not work at all in edge runtimes.
 * Cleanup is performed on-demand during normal requests instead.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()
export const RATE_LIMIT_CONFIG = {
  maxRequests: Number.isNaN(parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10)) 
    ? 10 
    : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
  windowMs: Number.isNaN(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10))
    ? 60000
    : parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
} as const

/**
 * Rate limiter configuration
 * Configurable via environment variables with safe fallbacks
 */
export const RATE_LIMIT_CONFIG = {
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
} as const

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address)
 * @returns Object with allowed status and retry info
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  // Validate identifier
  if (typeof identifier !== 'string' || identifier.trim() === '') {
    console.warn('[Rate Limiter] Invalid identifier provided, rejecting request')
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now(),
    }
  }

  // On-demand cleanup: purge expired entries during normal requests
  // This avoids module-level setInterval which is unsafe in serverless/edge runtimes
  const now = Date.now()
  if (rateLimitMap.size > 0 && (now - lastCleanupTime) > CLEANUP_INTERVAL_MS) {
    cleanupExpiredEntries()
    lastCleanupTime = now
  }

  const entry = rateLimitMap.get(identifier)

  // No entry or window expired - create new entry
  if (!entry || now > entry.resetTime) {
    const resetTime = now + RATE_LIMIT_CONFIG.windowMs
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime,
    })

    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxRequests - 1,
      resetTime,
    }
  }

  // Within window - check if limit exceeded
  if (entry.count >= RATE_LIMIT_CONFIG.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment count
  entry.count++

  return {
    allowed: true,
    remaining: RATE_LIMIT_CONFIG.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Clean up expired entries (optional, for memory management)
 * Automatically called during normal requests (on-demand cleanup)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  })
}

let cleanupIntervalId: ReturnType<typeof setInterval> | null = null

/**
 * Start periodic cleanup using setInterval (for long-running servers only)
 * This function should ONLY be called in traditional server environments,
 * never in serverless/edge runtimes. Use the ENABLE_RATE_LIMITER_CLEANUP_INTERVAL
 * environment variable or explicitly call this from server startup code.
 *
 * NOTE: In serverless/edge runtimes, cleanup happens automatically on-demand
 * during checkRateLimit calls. This function is only needed for long-running
 * Node.js servers where explicit cleanup intervals are desired.
 *
 * @returns true if cleanup was started, false if already running or not available
 */
export function startCleanup(): boolean {
  // Already running
  if (cleanupIntervalId !== null) {
    return false
  }

  // Check if we should start cleanup
  // Only start if explicitly enabled via env var OR if not in serverless environment
  const enableInterval = process.env.ENABLE_RATE_LIMITER_CLEANUP_INTERVAL === 'true'
  const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.EDGE_RUNTIME

  if (!enableInterval && isServerless) {
    // In serverless, don't start interval - rely on on-demand cleanup
    return false
  }

  // Check if setInterval is available
  if (typeof setInterval === 'undefined') {
    return false
  }

  // Start periodic cleanup every 5 minutes
  cleanupIntervalId = setInterval(() => {
    cleanupExpiredEntries()
  }, 5 * 60 * 1000) // 5 minutes

  return true
}

/**
 * Stop periodic cleanup (if started via startCleanup)
 * Useful for graceful shutdown in long-running servers
 */
export function stopCleanup(): void {
  if (cleanupIntervalId !== null && typeof clearInterval !== 'undefined') {
    clearInterval(cleanupIntervalId)
    cleanupIntervalId = null
  }
}

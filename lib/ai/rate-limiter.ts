/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

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

  // Cleanup expired entries periodically (when map grows large)
  if (rateLimitMap.size > 1000) {
    cleanupExpiredEntries()
  }

  const now = Date.now()
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
 * Call periodically in production
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  })
}

// Periodic cleanup every 5 minutes (production-safe)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupExpiredEntries()
  }, 5 * 60 * 1000) // 5 minutes
}

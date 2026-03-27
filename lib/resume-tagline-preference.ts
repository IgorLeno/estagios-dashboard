export const RESUME_USE_TAGLINE_STORAGE_KEY = "resume_use_tagline"
export const RESUME_USE_TAGLINE_COOKIE_KEY = "resume_use_tagline"
export const RESUME_USE_TAGLINE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
export const DEFAULT_RESUME_USE_TAGLINE = true

export function parseResumeUseTaglinePreference(value?: string | null): boolean {
  return value !== "false"
}

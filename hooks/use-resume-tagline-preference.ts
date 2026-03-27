"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DEFAULT_RESUME_USE_TAGLINE,
  parseResumeUseTaglinePreference,
  RESUME_USE_TAGLINE_COOKIE_KEY,
  RESUME_USE_TAGLINE_COOKIE_MAX_AGE,
  RESUME_USE_TAGLINE_STORAGE_KEY,
} from "@/lib/resume-tagline-preference"

const RESUME_USE_TAGLINE_EVENT = "resume-use-tagline-preference-change"

function persistResumeUseTaglineCookie(value: boolean) {
  document.cookie = `${RESUME_USE_TAGLINE_COOKIE_KEY}=${String(value)}; path=/; max-age=${RESUME_USE_TAGLINE_COOKIE_MAX_AGE}; samesite=lax`
}

export function readResumeUseTaglinePreference(): boolean {
  if (typeof window === "undefined") {
    return DEFAULT_RESUME_USE_TAGLINE
  }

  try {
    return parseResumeUseTaglinePreference(window.localStorage.getItem(RESUME_USE_TAGLINE_STORAGE_KEY))
  } catch {
    return DEFAULT_RESUME_USE_TAGLINE
  }
}

export function writeResumeUseTaglinePreference(value: boolean) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(RESUME_USE_TAGLINE_STORAGE_KEY, String(value))
  } catch {
    // Ignore localStorage write failures in this client-side preference.
  }

  persistResumeUseTaglineCookie(value)
  window.dispatchEvent(new CustomEvent<boolean>(RESUME_USE_TAGLINE_EVENT, { detail: value }))
}

export function useResumeTaglinePreference() {
  const [value, setValue] = useState<boolean>(() => readResumeUseTaglinePreference())

  useEffect(() => {
    const currentValue = readResumeUseTaglinePreference()
    setValue(currentValue)
    persistResumeUseTaglineCookie(currentValue)

    function handleStorage(event: StorageEvent) {
      if (event.key !== RESUME_USE_TAGLINE_STORAGE_KEY) return

      const nextValue = parseResumeUseTaglinePreference(event.newValue)
      setValue(nextValue)
      persistResumeUseTaglineCookie(nextValue)
    }

    function handlePreferenceChange(event: Event) {
      const nextValue = (event as CustomEvent<boolean>).detail
      setValue(typeof nextValue === "boolean" ? nextValue : readResumeUseTaglinePreference())
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener(RESUME_USE_TAGLINE_EVENT, handlePreferenceChange)

    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(RESUME_USE_TAGLINE_EVENT, handlePreferenceChange)
    }
  }, [])

  const updateValue = useCallback((nextValue: boolean) => {
    setValue(nextValue)
    writeResumeUseTaglinePreference(nextValue)
  }, [])

  return { value, setValue: updateValue }
}

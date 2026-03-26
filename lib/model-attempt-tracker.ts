export const MODEL_ATTEMPT_HISTORY_STORAGE_KEY = "ai_model_attempt_history_v1"
export const MODEL_FAILURE_WARNING_THRESHOLD = 3

type ModelAttemptStatus = "success" | "failure"

type ModelAttemptRecord = {
  model: string
  status: ModelAttemptStatus
  source?: string
  timestamp: number
}

type ModelFailureWarning = {
  consecutiveFailures: number
  threshold: number
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function readAttemptHistory(): ModelAttemptRecord[] {
  if (!canUseLocalStorage()) return []

  try {
    const raw = window.localStorage.getItem(MODEL_ATTEMPT_HISTORY_STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((entry): entry is ModelAttemptRecord => {
        if (!entry || typeof entry !== "object") return false
        if (!("model" in entry) || typeof entry.model !== "string") return false
        if (!("status" in entry) || (entry.status !== "success" && entry.status !== "failure")) return false
        if (!("timestamp" in entry) || typeof entry.timestamp !== "number") return false
        return true
      })
      .slice(-50)
  } catch {
    return []
  }
}

function writeAttemptHistory(history: ModelAttemptRecord[]) {
  if (!canUseLocalStorage()) return

  try {
    window.localStorage.setItem(MODEL_ATTEMPT_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-50)))
  } catch {
    // Ignore client-side storage failures.
  }
}

function recordModelAttempt(model: string | null | undefined, status: ModelAttemptStatus, source?: string) {
  const normalizedModel = typeof model === "string" ? model.trim() : ""
  if (!normalizedModel) return

  const history = readAttemptHistory()
  history.push({
    model: normalizedModel,
    status,
    source,
    timestamp: Date.now(),
  })
  writeAttemptHistory(history)
}

export function recordModelSuccess(model: string | null | undefined, source?: string) {
  recordModelAttempt(model, "success", source)
}

export function recordModelFailure(model: string | null | undefined, source?: string) {
  recordModelAttempt(model, "failure", source)
}

export function getModelFailureWarning(
  model: string | null | undefined,
  threshold: number = MODEL_FAILURE_WARNING_THRESHOLD
): ModelFailureWarning | null {
  const normalizedModel = typeof model === "string" ? model.trim() : ""
  if (!normalizedModel) return null

  const attempts = readAttemptHistory().filter((entry) => entry.model === normalizedModel)

  let consecutiveFailures = 0

  for (let index = attempts.length - 1; index >= 0; index--) {
    const attempt = attempts[index]
    if (attempt.status === "failure") {
      consecutiveFailures++
      if (consecutiveFailures >= threshold) {
        return { consecutiveFailures, threshold }
      }
      continue
    }

    break
  }

  return null
}

export function clearModelAttemptHistory() {
  if (!canUseLocalStorage()) return
  window.localStorage.removeItem(MODEL_ATTEMPT_HISTORY_STORAGE_KEY)
}

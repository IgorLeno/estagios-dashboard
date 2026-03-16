export const MAX_PROMPT_INPUT_LENGTH = 10000

export function sanitizeUserInput(input: string): string {
  let sanitized = input.slice(0, MAX_PROMPT_INPUT_LENGTH)
  sanitized = sanitized.replace(/```+/g, "[REDACTED_INSTRUCTION]")
  sanitized = sanitized.replace(/~~~+/g, "[REDACTED_INSTRUCTION]")
  sanitized = sanitized.replace(/###+/g, "[REDACTED_INSTRUCTION]")
  sanitized = sanitized.replace(/\[INST\]/gi, "[REDACTED_INSTRUCTION]")
  sanitized = sanitized.replace(/\[\/INST\]/gi, "[REDACTED_INSTRUCTION]")
  sanitized = sanitized.replace(/<\|im_start\|>/gi, "[REDACTED_INSTRUCTION]")
  sanitized = sanitized.replace(/<\|im_end\|>/gi, "[REDACTED_INSTRUCTION]")
  sanitized = sanitized.replace(/\[(SYSTEM|USER|ASSISTANT|INSTRUCTION|PROMPT)\]/gi, "[REDACTED_INSTRUCTION]")
  sanitized = sanitized.replace(/\[\/(SYSTEM|USER|ASSISTANT|INSTRUCTION|PROMPT)\]/gi, "[REDACTED_INSTRUCTION]")
  const instructionPatterns =
    /(^|[^A-Za-z0-9_])(ignore|forget|skip|do not|don't|system|assistant|user):/gim
  sanitized = sanitized.replace(instructionPatterns, (match, prefix) => {
    return prefix + "[REDACTED_INSTRUCTION]"
  })
  return sanitized.trim()
}

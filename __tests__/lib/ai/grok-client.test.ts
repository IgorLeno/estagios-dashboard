import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { callGrok } from "@/lib/ai/grok-client"
import { DEFAULT_MODEL } from "@/lib/ai/models"

describe("callGrok", () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-api-key"
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalApiKey
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("falls back to DEFAULT_MODEL when the provided model id is invalid", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Resposta" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    } as Response)

    await callGrok([{ role: "user", content: "Teste" }], { model: "gemini-2.5-flash" })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const request = fetchMock.mock.calls[0]?.[1]
    const body = JSON.parse(String(request?.body))
    expect(body.model).toBe(DEFAULT_MODEL)
  })

  it("passes through valid provider/name model ids", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Resposta" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    } as Response)

    await callGrok([{ role: "user", content: "Teste" }], { model: "anthropic/claude-3.5-sonnet" })

    const request = fetchMock.mock.calls[0]?.[1]
    const body = JSON.parse(String(request?.body))
    expect(body.model).toBe("anthropic/claude-3.5-sonnet")
  })

  it("includes the effective model id in 4xx error messages", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: { message: "Invalid request" } }),
    } as Response)

    await expect(
      callGrok([{ role: "user", content: "Teste" }], { model: "modelo-invalido" })
    ).rejects.toThrow(`[model: ${DEFAULT_MODEL}]`)
  })

  it("supports array-based content parts returned by the provider", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: [{ type: "text", text: "Resposta " }, { type: "text", text: "em partes" }],
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    } as Response)

    const result = await callGrok([{ role: "user", content: "Teste" }])

    expect(result.content).toBe("Resposta em partes")
  })

  it("includes the effective model id when the provider returns no content", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "" } }],
        usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
      }),
    } as Response)

    await expect(callGrok([{ role: "user", content: "Teste" }])).rejects.toThrow(`[model: ${DEFAULT_MODEL}]`)
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { mockGetUser, mockSingle } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSingle: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    })),
  })),
}))

import { POST } from "@/app/api/ai/render-resume-html/route"

describe("POST /api/ai/render-resume-html", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: "test-user-id" } },
      error: null,
    })
  })

  it("renders saved resume markdown instead of rebuilding the base CV", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "vaga-1",
        curriculo_text_pt: "# Igor Fernandes\n\n## COMPETÊNCIAS\n\n- SQL\n- Python",
        curriculo_text_en: null,
      },
      error: null,
    })

    const request = new NextRequest("http://localhost:3000/api/ai/render-resume-html", {
      method: "POST",
      body: JSON.stringify({
        vagaId: "vaga-1",
        language: "pt",
        resumeTemplate: "modelo2",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.html).toContain("Igor Fernandes")
    expect(data.data.html).toContain("COMPETÊNCIAS")
    expect(data.data.html).toContain("SQL")
    expect(data.data.html).toContain("font-family: Georgia, serif")
  })

  it("returns 400 when the saved resume markdown does not exist", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "vaga-1",
        curriculo_text_pt: null,
        curriculo_text_en: null,
      },
      error: null,
    })

    const request = new NextRequest("http://localhost:3000/api/ai/render-resume-html", {
      method: "POST",
      body: JSON.stringify({
        vagaId: "vaga-1",
        language: "pt",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain("No saved resume markdown found")
  })
})

import type { Page, Route } from "@playwright/test"
import type { JobDetails } from "@/lib/ai/types"

/**
 * Mock successful job parse API response
 */
export async function mockParseJobSuccess(page: Page) {
  await page.route("**/api/ai/parse-job", async (route: Route) => {
    if (route.request().method() === "POST") {
      const mockResponse = {
        success: true,
        data: {
          empresa: "Saipem",
          cargo: "Estagiário QHSE",
          local: "Guarujá, São Paulo",
          modalidade: "Híbrido" as const,
          tipo_vaga: "Estágio" as const,
          requisitos_obrigatorios: [
            "Cursando Engenharia Química (3º-5º ano)",
            "Inglês intermediário",
            "Conhecimento em ISO 9001:2015",
          ],
          requisitos_desejaveis: ["Experiência com Excel avançado", "Conhecimento em Power BI"],
          responsabilidades: [
            "Monitorar registros de qualidade e segurança",
            "Suporte em KPIs e indicadores",
            "Participar de auditorias internas",
          ],
          beneficios: ["Seguro saúde", "Vale refeição", "Vale transporte"],
          salario: "R$ 1.800,00 + benefícios",
          idioma_vaga: "pt" as const,
        } satisfies JobDetails,
        metadata: {
          duration: 2500,
          model: "gemini-2.5-flash",
          timestamp: new Date().toISOString(),
        },
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      })
    } else {
      // Health check (GET)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          message: "AI Job Parser is ready",
          model: "gemini-2.5-flash",
        }),
      })
    }
  })
}

/**
 * Mock rate limit (429) error response
 */
export async function mockParseJobRateLimit(page: Page) {
  await page.route("**/api/ai/parse-job", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Limite de requisições atingido. Tente novamente em alguns segundos.",
        }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock network/server error (500) response
 */
export async function mockParseJobNetworkError(page: Page) {
  await page.route("**/api/ai/parse-job", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Erro ao processar análise. Tente novamente.",
        }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock successful resume generation API response
 */
export async function mockGenerateResumeSuccess(page: Page) {
  await page.route("**/api/ai/generate-resume", async (route: Route) => {
    if (route.request().method() === "POST") {
      // Create a minimal valid PDF in base64
      // This is just a mock - not a real PDF
      const mockPdfBase64 = Buffer.from("%PDF-1.4\n%Mock PDF content").toString("base64")

      const mockResponse = {
        success: true,
        data: {
          pdfBase64: mockPdfBase64,
          filename: "cv-igor-fernandes-saipem-pt.pdf",
        },
        metadata: {
          duration: 3500,
          model: "gemini-2.5-flash",
          tokenUsage: {
            inputTokens: 1500,
            outputTokens: 800,
            totalTokens: 2300,
          },
          personalizedSections: ["summary", "skills", "projects"],
        },
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      })
    } else {
      // Health check (GET)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          message: "AI Resume Generator is ready",
        }),
      })
    }
  })
}

/**
 * Mock resume generation error response
 */
export async function mockGenerateResumeError(page: Page) {
  await page.route("**/api/ai/generate-resume", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Erro ao gerar currículo. Tente novamente.",
        }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Unmock all API routes (restore real API calls)
 */
export async function unmockAllApis(page: Page) {
  await page.unroute("**/api/ai/parse-job")
  await page.unroute("**/api/ai/generate-resume")
}

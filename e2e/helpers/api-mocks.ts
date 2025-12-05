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
          requisitos_score: 4.0, // 0-5 scale (matches JobDetailsSchema)
          fit: 4.5, // 0-5 scale (matches JobDetailsSchema)
          etapa: "Indefinido",
          status: "Pendente" as const,
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
 * Mock successful HTML resume generation (new flow)
 */
export async function mockGenerateResumeHtmlSuccess(page: Page) {
  await page.route("**/api/ai/generate-resume-html", async (route: Route) => {
    if (route.request().method() === "POST") {
      const mockHtmlContent = `
        <div class="resume-content">
          <h1>Igor Fernandes</h1>
          <p>Engenharia Química - 5º ano</p>
          <h2>Resumo</h2>
          <p>Estudante de Engenharia Química com experiência em qualidade e segurança...</p>
          <h2>Habilidades</h2>
          <ul>
            <li>ISO 9001:2015</li>
            <li>Excel Avançado</li>
            <li>Power BI</li>
          </ul>
        </div>
      `

      const mockResponse = {
        success: true,
        data: {
          html: mockHtmlContent,
        },
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
          message: "AI Resume HTML Generator is ready",
        }),
      })
    }
  })
}

/**
 * Mock successful PDF generation from HTML
 */
export async function mockHtmlToPdfSuccess(page: Page) {
  await page.route("**/api/ai/html-to-pdf", async (route: Route) => {
    if (route.request().method() === "POST") {
      // Minimal valid PDF header in base64
      const mockPdfBase64 =
        "JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVGl0bGUgKP7/AEMAdQByAHIA7QBjAHUAbABvACkKL0NyZWF0b3IgKFB1cHBldGVlcikKL1Byb2R1Y2VyIChTa2lhL1BERiBtMTEwKQovQ3JlYXRpb25EYXRlIChEOjIwMjQwMTAxMDAwMDAwKQo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMyAwIFIKPj4KZW5kb2JqCjMgMCBvYmo8PAovVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzQgMCBSXQo+PgplbmRvYmoKNCAwIG9iago8PAovVHlwZSAvUGFnZQovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUGFyZW50IDMgMCBSCi9Db250ZW50cyA1IDAgUgovUmVzb3VyY2VzIDw8Cj4+Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggMgo+PgpzdHJlYW0KCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAxMjQgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMjMwIDAwMDAwIG4gCjAwMDAwMDAzNDIgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDIgMCBSCi9JbmZvIDEgMCBSCj4+CnN0YXJ0eHJlZgo0MDUKJSVFT0YK"

      const mockResponse = {
        success: true,
        data: {
          pdfBase64: mockPdfBase64,
          filename: "cv-igor-fernandes-saipem-pt.pdf",
        },
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock error for HTML resume generation
 */
export async function mockGenerateResumeHtmlError(page: Page) {
  await page.route("**/api/ai/generate-resume-html", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Erro ao gerar preview. Tente novamente.",
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
  await page.unroute("**/api/ai/generate-resume-html")
  await page.unroute("**/api/ai/html-to-pdf")
}

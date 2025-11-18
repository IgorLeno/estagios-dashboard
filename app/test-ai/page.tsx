"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ParseJobResponse, ParseJobErrorResponse } from "@/lib/ai/types"

const EXAMPLE_JOB_DESCRIPTION = `Vaga de Estágio em Engenharia Química - Saipem

Local: Guarujá, São Paulo
Modalidade: Híbrido

Sobre a empresa:
Saipem é uma multinacional italiana especializada em soluções de engenharia para setores de energia e infraestrutura. Com presença global, oferece um ambiente dinâmico para profissionais em início de carreira.

Responsabilidades:
- Monitoramento de registros de qualidade, saúde, segurança e meio ambiente
- Suporte na elaboração e acompanhamento de KPIs do departamento QHSE
- Participação em auditorias internas e externas
- Análise de documentos técnicos e procedimentos

Requisitos obrigatórios:
- Graduação em andamento em Engenharia Química, Ambiental ou áreas correlatas
- Inglês intermediário (leitura e escrita)
- Conhecimento intermediário em MS Excel
- Disponibilidade para estágio de 6 horas/dia

Requisitos desejáveis:
- Conhecimento da norma ISO 9001:2015
- Conhecimento em ferramentas de gestão de qualidade
- Experiência prévia em indústria

Benefícios:
- Seguro saúde
- Vale refeição
- Vale transporte
- Bolsa auxílio competitiva`

/**
 * Test page component that provides an interactive UI to parse job descriptions and inspect results.
 *
 * Displays a textarea prefilled with an example job description, a parse button with loading state,
 * and conditionally renders either a human-readable extracted-data card plus a JSON response card on success,
 * or an error card with details on failure. When parsing, the component POSTs `{ jobDescription }` to
 * `/api/ai/parse-job` and stores the API response for rendering.
 *
 * @returns The React element for the AI job parser test interface.
 */
export default function TestAIPage() {
  const [jobDescription, setJobDescription] = useState(EXAMPLE_JOB_DESCRIPTION)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ParseJobResponse | ParseJobErrorResponse | null>(null)

  const handleParse = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/ai/parse-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobDescription }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Job Parser - Test Interface</h1>
          <p className="text-muted-foreground mt-2">
            Test the Gemini-powered job description parser. Paste a job description below and click Parse Job.
          </p>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
            <CardDescription>
              Paste the job description text from LinkedIn, Indeed, email, or company website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste job description here..."
              className="min-h-[300px] font-mono text-sm"
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {jobDescription.length} characters (min: 50)
              </p>
              <Button onClick={handleParse} disabled={isLoading || jobDescription.length < 50}>
                {isLoading ? "Parsing..." : "Parse Job"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <>
            {/* Success Result */}
            {result.success && (
              <>
                {/* Human-Readable Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Extracted Data</CardTitle>
                    <CardDescription>
                      Parsed in {result.metadata.duration}ms using {result.metadata.model}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                        <p className="text-lg font-semibold">{result.data.empresa}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Cargo</p>
                        <p className="text-lg font-semibold">{result.data.cargo}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Local</p>
                        <p className="text-lg font-semibold">{result.data.local}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Modalidade</p>
                        <Badge variant="outline">{result.data.modalidade}</Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tipo de Vaga</p>
                        <Badge variant="outline">{result.data.tipo_vaga}</Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Idioma</p>
                        <Badge variant="outline">{result.data.idioma_vaga.toUpperCase()}</Badge>
                      </div>
                    </div>

                    {/* Arrays */}
                    {result.data.requisitos_obrigatorios.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Requisitos Obrigatórios
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {result.data.requisitos_obrigatorios.map((req, i) => (
                            <li key={i} className="text-sm">
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.data.requisitos_desejaveis.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Requisitos Desejáveis
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {result.data.requisitos_desejaveis.map((req, i) => (
                            <li key={i} className="text-sm">
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.data.responsabilidades.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Responsabilidades
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {result.data.responsabilidades.map((resp, i) => (
                            <li key={i} className="text-sm">
                              {resp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.data.beneficios.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Benefícios
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {result.data.beneficios.map((ben, i) => (
                            <li key={i} className="text-sm">
                              {ben}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.data.salario && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Salário</p>
                        <p className="text-lg font-semibold">{result.data.salario}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* JSON Output */}
                <Card>
                  <CardHeader>
                    <CardTitle>JSON Response</CardTitle>
                    <CardDescription>Complete API response for debugging</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Error Result */}
            {!result.success && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Error</CardTitle>
                  <CardDescription>Failed to parse job description</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-destructive mb-4">{result.error}</p>
                  {result.details && (
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Instructions */}
        {!result && (
          <Card>
            <CardHeader>
              <CardTitle>How to Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Paste a job description from LinkedIn, Indeed, or any other source</li>
                <li>Click &quot;Parse Job&quot; to extract structured data</li>
                <li>Review the extracted fields in the human-readable card</li>
                <li>Check the JSON response for complete data and metadata</li>
              </ol>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Expected Fields:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>✓ Empresa, Cargo, Local</li>
                  <li>✓ Modalidade (Presencial/Híbrido/Remoto)</li>
                  <li>✓ Tipo de Vaga (Estágio/Júnior/Pleno/Sênior)</li>
                  <li>✓ Requisitos obrigatórios e desejáveis</li>
                  <li>✓ Responsabilidades e benefícios</li>
                  <li>✓ Salário (opcional)</li>
                  <li>✓ Idioma da vaga (pt/en)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
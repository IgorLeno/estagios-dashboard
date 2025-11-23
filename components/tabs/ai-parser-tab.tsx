"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle, Sparkles, FileText, FileBarChart } from "lucide-react"
import { toast } from "sonner"
import { mapJobDetailsToFormData, type FormData } from "@/lib/utils/ai-mapper"
import type {
  ParseJobResponse,
  ParseJobErrorResponse,
  JobDetails,
  GenerateResumeResponse,
  GenerateResumeErrorResponse,
} from "@/lib/ai/types"

interface AiParserTabProps {
  formData: FormData
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void
  onComplete: () => void
}

const MIN_CHARS = 50
const MAX_CHARS = 50000

export function AiParserTab({ formData, setFormData, onComplete }: AiParserTabProps) {
  const [jobDescription, setJobDescription] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null)
  const [generatingResume, setGeneratingResume] = useState(false)
  const [resumePdfBase64, setResumePdfBase64] = useState<string | null>(null)
  const [resumeFilename, setResumeFilename] = useState<string | null>(null)
  const [activePreviewTab, setActivePreviewTab] = useState<"analysis" | "resume">("analysis")

  async function handleAnalyze() {
    setAnalyzing(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      })

      const result: ParseJobResponse | ParseJobErrorResponse = await response.json()

      if (result.success) {
        const analiseMarkdown = (result as any).analise || ""
        const mapped = mapJobDetailsToFormData(result.data, analiseMarkdown)
        setFormData((prev) => ({ ...prev, ...mapped }))
        setJobDetails(result.data)
        toast.success("✓ Análise gerada com sucesso!")

        // Auto-switch to manual tab after brief delay
        setTimeout(() => onComplete(), 1500)
      } else {
        handleError(response.status, result.error)
      }
    } catch (err) {
      setError("Network error. Check connection and try again.")
      toast.error("Connection failed")
    } finally {
      setAnalyzing(false)
    }
  }

  function handleError(status: number, message: string) {
    switch (status) {
      case 429:
        setError("Rate limit reached. Try again in a moment or enter manually.")
        toast.error("Rate limit exceeded")
        break
      case 504:
        setError("Analysis timed out. Try shorter description or enter manually.")
        toast.error("Request timeout")
        break
      case 400:
        setError("Could not parse format. Check description or enter manually.")
        toast.error("Invalid format")
        break
      default:
        setError(message || "Unknown error occurred")
        toast.error("Analysis failed")
    }
  }

  async function handleGenerateResume() {
    if (!jobDetails) {
      toast.error("Análise da vaga necessária primeiro")
      return
    }

    setGeneratingResume(true)
    try {
      const response = await fetch("/api/ai/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          language: "pt",
        }),
      })

      if (!response.ok) {
        const errorData: GenerateResumeErrorResponse = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const result: GenerateResumeResponse = await response.json()

      if (result.success) {
        setResumePdfBase64(result.data.pdfBase64)
        setResumeFilename(result.data.filename)
        setActivePreviewTab("resume")
        toast.success("✓ Currículo gerado com sucesso!")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao gerar currículo"
      toast.error(errorMessage)
      console.error("Resume generation error:", err)
    } finally {
      setGeneratingResume(false)
    }
  }

  function handleDownloadResume() {
    if (!resumePdfBase64 || !resumeFilename) return

    const link = document.createElement("a")
    link.href = `data:application/pdf;base64,${resumePdfBase64}`
    link.download = resumeFilename
    link.click()
  }

  function handleSwitchToManual() {
    onComplete()
  }

  const charCount = jobDescription.length
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="job-description">Job Description</Label>
          <span
            className={`text-xs ${
              charCount < MIN_CHARS
                ? "text-muted-foreground"
                : charCount > MAX_CHARS
                  ? "text-destructive"
                  : "text-green-600"
            }`}
          >
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
            {charCount < MIN_CHARS && ` (min ${MIN_CHARS})`}
          </span>
        </div>

        <Textarea
          id="job-description"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here (minimum 50 characters)..."
          rows={12}
          className="font-mono text-sm"
          disabled={analyzing}
        />

        <p className="text-xs text-muted-foreground">
          Paste job description from LinkedIn, Indeed, emails, or company websites. The AI will extract company, role,
          location, requirements, and more.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setError(null)} disabled={analyzing}>
                Try Again
              </Button>
              <Button size="sm" variant="outline" onClick={handleSwitchToManual}>
                Switch to Manual
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button onClick={handleAnalyze} disabled={!isValid || analyzing} className="flex-1" size="lg">
          {analyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando análise...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Análise
            </>
          )}
        </Button>

        <Button
          onClick={handleGenerateResume}
          disabled={!jobDetails || analyzing || generatingResume}
          variant={jobDetails && !generatingResume ? "default" : "outline"}
          className="flex-1"
          size="lg"
        >
          {generatingResume ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando currículo...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Gerar Currículo
            </>
          )}
        </Button>
      </div>

      <Button variant="ghost" onClick={handleSwitchToManual} disabled={analyzing} className="w-full">
        Skip to Manual
      </Button>

      {jobDetails && (
        <Tabs value={activePreviewTab} onValueChange={(v) => setActivePreviewTab(v as "analysis" | "resume")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis">
              <FileBarChart className="mr-2 h-4 w-4" />
              Análise da Vaga
            </TabsTrigger>
            <TabsTrigger value="resume" disabled={!resumePdfBase64}>
              <FileText className="mr-2 h-4 w-4" />
              Prévia do Currículo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="mt-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <h3 className="font-semibold text-sm text-slate-700">Dados Extraídos</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-slate-600">Empresa:</span>
                  <p className="text-slate-900">{jobDetails.empresa}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Cargo:</span>
                  <p className="text-slate-900">{jobDetails.cargo}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Local:</span>
                  <p className="text-slate-900">{jobDetails.local}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Modalidade:</span>
                  <p className="text-slate-900">{jobDetails.modalidade}</p>
                </div>
              </div>
              {jobDetails.requisitos_obrigatorios && jobDetails.requisitos_obrigatorios.length > 0 && (
                <div>
                  <span className="font-medium text-slate-600 text-sm">Requisitos Obrigatórios:</span>
                  <ul className="list-disc list-inside text-sm text-slate-700 mt-1 space-y-1">
                    {jobDetails.requisitos_obrigatorios.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
              {jobDetails.responsabilidades && jobDetails.responsabilidades.length > 0 && (
                <div>
                  <span className="font-medium text-slate-600 text-sm">Responsabilidades:</span>
                  <ul className="list-disc list-inside text-sm text-slate-700 mt-1 space-y-1">
                    {jobDetails.responsabilidades.slice(0, 5).map((resp, idx) => (
                      <li key={idx}>{resp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="resume" className="mt-4">
            {resumePdfBase64 ? (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-700">Currículo Personalizado</h3>
                    <p className="text-xs text-slate-500 mt-1">PDF gerado e pronto para download</p>
                  </div>
                  <Button onClick={handleDownloadResume} size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-white p-3 rounded border border-slate-200">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <span className="font-mono">{resumeFilename}</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-8 rounded-lg border border-dashed border-slate-300 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">
                  Clique em "Gerar Currículo" para criar uma prévia personalizada
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

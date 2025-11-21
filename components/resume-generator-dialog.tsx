"use client"

import { useState } from "react"
import { FileText, Loader2, Download, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

type GenerationState = "idle" | "loading" | "success" | "error"

interface GenerateResumeResponse {
  success: boolean
  data?: {
    pdfBase64: string
    filename: string
    atsScore?: number
  }
  metadata?: {
    duration: number
    model: string
    tokenUsage: {
      inputTokens: number
      outputTokens: number
      totalTokens: number
    }
    personalizedSections: string[]
  }
  error?: string
  details?: unknown
}

interface ResumeGeneratorDialogProps {
  vagaId?: string
  jobDescription?: string
  trigger?: React.ReactNode
  onSuccess?: (filename: string) => void
}

export function ResumeGeneratorDialog({ vagaId, jobDescription, trigger, onSuccess }: ResumeGeneratorDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<GenerationState>("idle")
  const [language, setLanguage] = useState<"pt" | "en">("pt")
  const [result, setResult] = useState<GenerateResumeResponse["data"] | null>(null)
  const [metadata, setMetadata] = useState<GenerateResumeResponse["metadata"] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!vagaId && !jobDescription) {
      toast.error("No job data provided")
      return
    }

    setState("loading")
    setError(null)
    setResult(null)
    setMetadata(null)

    try {
      const requestBody = {
        ...(vagaId ? { vagaId } : { jobDescription }),
        language,
      }

      const response = await fetch("/api/ai/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data: GenerateResumeResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate resume")
      }

      if (data.data) {
        setResult(data.data)
        setMetadata(data.metadata || null)
        setState("success")
        toast.success("Resume generated successfully!")
        onSuccess?.(data.data.filename)
      } else {
        throw new Error("No data returned from API")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(errorMessage)
      setState("error")
      toast.error(errorMessage)
    }
  }

  const handleDownload = () => {
    if (!result?.pdfBase64 || !result?.filename) {
      toast.error("No PDF available to download")
      return
    }

    try {
      // Convert base64 to blob
      const byteCharacters = atob(result.pdfBase64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: "application/pdf" })

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("PDF downloaded successfully!")
    } catch (err) {
      toast.error("Failed to download PDF")
      console.error("Download error:", err)
    }
  }

  const handleReset = () => {
    setState("idle")
    setError(null)
    setResult(null)
    setMetadata(null)
  }

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      // Reset state when dialog closes
      setTimeout(handleReset, 300) // Delay to allow close animation
    }
  }

  const isDisabled = !vagaId && !jobDescription

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" disabled={isDisabled}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Tailored Resume
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Tailored Resume</DialogTitle>
          <DialogDescription>
            Create a personalized resume optimized for this job posting. Select your preferred language and click
            generate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Language Selection */}
          {state === "idle" && (
            <div className="space-y-3">
              <Label>Resume Language</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage("pt")}
                  className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                    language === "pt"
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-sm font-medium">Português</div>
                  <div className="text-xs text-muted-foreground">PT-BR</div>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                    language === "en"
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-sm font-medium">English</div>
                  <div className="text-xs text-muted-foreground">EN-US</div>
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {state === "loading" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium">Generating your resume...</p>
                <p className="text-xs text-muted-foreground mt-1">This usually takes 5-8 seconds</p>
              </div>
            </div>
          )}

          {/* Success State */}
          {state === "success" && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">Resume generated successfully!</p>
                  <p className="text-xs text-green-700 mt-1">{result.filename}</p>
                </div>
              </div>

              {result.atsScore && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">ATS Optimization Score</span>
                  <Badge variant="default">{result.atsScore}%</Badge>
                </div>
              )}

              {metadata && (
                <div className="space-y-2 rounded-lg border p-3 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{(metadata.duration / 1000).toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Model:</span>
                    <span className="font-medium">{metadata.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Personalized Sections:</span>
                    <span className="font-medium">{metadata.personalizedSections.join(", ")}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {state === "error" && error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Failed to generate resume</p>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {state === "idle" && (
            <>
              <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleGenerate}>
                <FileText className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </>
          )}

          {state === "loading" && (
            <Button variant="outline" className="w-full" disabled>
              Generating...
            </Button>
          )}

          {state === "success" && (
            <>
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Generate Another
              </Button>
              <Button className="flex-1" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </>
          )}

          {state === "error" && (
            <>
              <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
                Close
              </Button>
              <Button className="flex-1" onClick={handleGenerate}>
                Retry
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

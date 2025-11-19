"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { mapJobDetailsToFormData, type FormData } from "@/lib/utils/ai-mapper"
import type { ParseJobResponse, ParseJobErrorResponse } from "@/lib/ai/types"

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
        const mapped = mapJobDetailsToFormData(result.data)
        setFormData((prev) => ({ ...prev, ...mapped }))
        toast.success("Analysis complete! Review the data.")

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
          Paste job description from LinkedIn, Indeed, emails, or company websites. The AI will
          extract company, role, location, requirements, and more.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setError(null)}
                disabled={analyzing}
              >
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
        <Button
          onClick={handleAnalyze}
          disabled={!isValid || analyzing}
          className="flex-1"
          size="lg"
        >
          {analyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze with AI
            </>
          )}
        </Button>

        <Button variant="outline" onClick={handleSwitchToManual} disabled={analyzing}>
          Skip to Manual
        </Button>
      </div>
    </div>
  )
}

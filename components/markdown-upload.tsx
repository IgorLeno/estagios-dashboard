"use client"

import { useState, useRef, type DragEvent } from "react"
import { createClient } from "@/lib/supabase/client"
import { parseVagaFromMarkdown, isMarkdownFile, sanitizeMarkdown, type ParsedVagaData } from "@/lib/markdown-parser"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

interface MarkdownUploadProps {
  onUploadComplete: (url: string, parsedData?: ParsedVagaData) => void
  onParseComplete?: (parsedData: ParsedVagaData) => void
  currentFile?: string
  label?: string
  autoFillFields?: boolean // Se true, preenche campos automaticamente
}

export function MarkdownUpload({
  onUploadComplete,
  onParseComplete,
  currentFile,
  label = "Análise (.md)",
  autoFillFields = true,
}: MarkdownUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(
    currentFile ? currentFile.split("/").pop() || null : null
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedVagaData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const handleFile = async (file: File) => {
    // Validate file type
    if (!isMarkdownFile(file.name)) {
      setError("Por favor, envie apenas arquivos Markdown (.md)")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("O arquivo deve ter no máximo 2MB")
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(false)
    setUploadProgress(10)

    try {
      // Read file content for parsing
      const content = await file.text()
      const sanitized = sanitizeMarkdown(content)
      setUploadProgress(30)

      // Parse markdown to extract vaga data
      const parsed = parseVagaFromMarkdown(sanitized)
      setParsedData(parsed)
      setUploadProgress(50)

      // Generate unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage.from("analises").upload(filePath, file)

      if (uploadError) throw uploadError
      setUploadProgress(80)

      // Get public URL
      const { data } = supabase.storage.from("analises").getPublicUrl(filePath)
      setUploadProgress(100)

      setUploadedFileName(file.name)
      setSuccess(true)
      onUploadComplete(data.publicUrl, autoFillFields ? parsed : undefined)

      if (onParseComplete && Object.keys(parsed).length > 0) {
        onParseComplete(parsed)
      }

      // Reset success message after 3s
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Erro ao fazer upload:", err)
      setError(err instanceof Error ? err.message : "Erro ao fazer upload do arquivo")
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleRemove = () => {
    setUploadedFileName(null)
    setParsedData(null)
    setSuccess(false)
    onUploadComplete("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="md-upload">{label}</Label>

      {uploadedFileName ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-muted rounded-md border">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{uploadedFileName}</span>
              {success && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
              aria-label="Remover arquivo"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {parsedData && Object.keys(parsedData).length > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                ✨ Campos detectados automaticamente:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-800 dark:text-blue-200">
                {parsedData.empresa && <div>• Empresa: {parsedData.empresa}</div>}
                {parsedData.cargo && <div>• Cargo: {parsedData.cargo}</div>}
                {parsedData.local && <div>• Local: {parsedData.local}</div>}
                {parsedData.modalidade && <div>• Modalidade: {parsedData.modalidade}</div>}
                {parsedData.requisitos !== undefined && <div>• Requisitos: {parsedData.requisitos}%</div>}
                {parsedData.fit !== undefined && <div>• Fit: {parsedData.fit}/10</div>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-md p-6 text-center transition-all ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input
            ref={fileInputRef}
            id="md-upload"
            type="file"
            accept=".md"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          <label
            htmlFor="md-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
            aria-label={`Upload ${label}`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <div className="w-full max-w-xs mt-2">
                  <Progress value={uploadProgress} className="h-1" />
                </div>
              </>
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {uploading ? "Enviando e processando..." : isDragging ? "Solte aqui!" : "Arraste ou clique para upload"}
              </p>
              <p className="text-xs text-muted-foreground">Arquivo Markdown (máx. 2MB)</p>
              {autoFillFields && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  ⚡ Preenchimento automático ativado
                </p>
              )}
            </div>
          </label>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

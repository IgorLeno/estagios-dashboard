"use client"

import { useState, useRef, type DragEvent } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

interface FileUploadProps {
  onUploadComplete: (url: string) => void
  currentFile?: string
  label?: string
}

export function FileUpload({ onUploadComplete, currentFile, label = "Currículo (Opcional)" }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(
    currentFile ? currentFile.split("/").pop() || null : null,
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const handleFile = async (file: File) => {
    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!validTypes.includes(file.type)) {
      setError("Por favor, envie apenas arquivos PDF ou Word (.doc, .docx)")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("O arquivo deve ter no máximo 5MB")
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(false)
    setUploadProgress(10)

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      setUploadProgress(30)

      // Upload file
      const { error: uploadError } = await supabase.storage.from("curriculos").upload(filePath, file)

      if (uploadError) throw uploadError

      setUploadProgress(70)

      // Get public URL
      const { data } = supabase.storage.from("curriculos").getPublicUrl(filePath)

      setUploadProgress(100)
      setUploadedFileName(file.name)
      setSuccess(true)
      onUploadComplete(data.publicUrl)

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
    setSuccess(false)
    onUploadComplete("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="cv-upload">{label}</Label>
      <div className="space-y-2">
        {uploadedFileName ? (
          <div className="flex items-center justify-between p-3 bg-muted rounded-md border">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{uploadedFileName}</span>
              {success && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={uploading}>
              <X className="h-4 w-4" />
            </Button>
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
              id="cv-upload"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
            <label
              htmlFor="cv-upload"
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
                  {uploading ? "Enviando..." : isDragging ? "Solte aqui!" : "Arraste ou clique para upload"}
                </p>
                <p className="text-xs text-muted-foreground">PDF ou Word (máx. 5MB)</p>
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
    </div>
  )
}

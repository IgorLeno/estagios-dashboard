"use client"

import type React from "react"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, FileText, X, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FileUploadProps {
  onUploadComplete: (url: string) => void
  currentFile?: string
}

export function FileUpload({ onUploadComplete, currentFile }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(
    currentFile ? currentFile.split("/").pop() || null : null,
  )
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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

    try {
      const supabase = createClient()

      // Generate unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      // Upload file
      const { error: uploadError } = await supabase.storage.from("curriculos").upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage.from("curriculos").getPublicUrl(filePath)

      setUploadedFileName(file.name)
      onUploadComplete(data.publicUrl)
    } catch (err) {
      console.error("[v0] Error uploading file:", err)
      setError(err instanceof Error ? err.message : "Erro ao fazer upload do arquivo")
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setUploadedFileName(null)
    onUploadComplete("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="cv-upload">Currículo (Opcional)</Label>
      <div className="space-y-2">
        {uploadedFileName ? (
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{uploadedFileName}</span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={uploading}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-md p-6 text-center hover:border-primary/50 transition-colors">
            <input
              ref={fileInputRef}
              id="cv-upload"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
            <label htmlFor="cv-upload" className="cursor-pointer flex flex-col items-center gap-2">
              {uploading ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium">{uploading ? "Enviando..." : "Clique para fazer upload"}</p>
                <p className="text-xs text-muted-foreground">PDF ou Word (máx. 5MB)</p>
              </div>
            </label>
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

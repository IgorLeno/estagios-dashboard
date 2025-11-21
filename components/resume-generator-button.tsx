"use client"

import { Button } from "@/components/ui/button"
import { ResumeGeneratorDialog } from "./resume-generator-dialog"

interface ResumeGeneratorButtonProps {
  vagaId?: string
  jobDescription?: string
  variant?: "default" | "outline" | "ghost"
  className?: string
}

export function ResumeGeneratorButton({
  vagaId,
  jobDescription,
  variant = "default",
  className,
}: ResumeGeneratorButtonProps) {
  // Disable if neither vagaId nor jobDescription provided
  const isDisabled = !vagaId && !jobDescription

  return (
    <ResumeGeneratorDialog
      trigger={
        <Button variant={variant} disabled={isDisabled} className={className}>
          Generate Tailored Resume
        </Button>
      }
      vagaId={vagaId}
      jobDescription={jobDescription}
    />
  )
}

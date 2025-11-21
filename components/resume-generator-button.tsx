"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
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
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Disable if neither vagaId nor jobDescription provided
  const isDisabled = !vagaId && !jobDescription

  return (
    <>
      <Button variant={variant} onClick={() => setIsDialogOpen(true)} disabled={isDisabled} className={className}>
        Generate Tailored Resume
      </Button>

      <ResumeGeneratorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        vagaId={vagaId}
        jobDescription={jobDescription}
      />
    </>
  )
}

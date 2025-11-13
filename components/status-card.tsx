"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, XCircle, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatusCardProps {
  status: "Pendente" | "Avançado" | "Melou" | "Contratado"
  etapa?: string
}

const statusConfig = {
  Pendente: {
    icon: Clock,
    color: "bg-gray-100 text-gray-700 border-gray-300",
    iconColor: "text-gray-500",
  },
  Avançado: {
    icon: Briefcase,
    color: "bg-purple-100 text-purple-700 border-purple-300",
    iconColor: "text-purple-500",
  },
  Melou: {
    icon: XCircle,
    color: "bg-red-100 text-red-700 border-red-300",
    iconColor: "text-red-500",
  },
  Contratado: {
    icon: CheckCircle2,
    color: "bg-green-100 text-green-700 border-green-300",
    iconColor: "text-green-500",
  },
}

export function StatusCard({ status, etapa }: StatusCardProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Card className="glass-card hover-lift">
      <CardHeader>
        <CardTitle className="text-lg">Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-muted", config.iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
          <Badge variant="outline" className={cn("px-4 py-2 text-sm font-medium rounded-full", config.color)}>
            {status}
          </Badge>
        </div>
        {etapa && (
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">Etapa atual</p>
            <p className="text-base font-medium text-foreground mt-1">{etapa}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DashboardHeaderProps {
  currentDate: Date
  onPrevDate: () => void
  onNextDate: () => void
  onDateSelect: (date: Date) => void
}

export function DashboardHeader({ currentDate, onPrevDate, onNextDate, onDateSelect }: DashboardHeaderProps) {
  const formattedDate = format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Painel de Estágios</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Acompanhe suas candidaturas em tempo real</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-card border border-border rounded-full px-1 py-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevDate}
            data-testid="prev-date-button"
            aria-label="Dia anterior"
            className="h-7 w-7 rounded-full"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                data-testid="date-picker-trigger"
                className="h-7 rounded-full px-3 text-sm font-semibold min-w-[130px] justify-center hover:bg-muted/50"
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-primary" />
                <span className="truncate">{formattedDate}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 glass-card-intense" align="end">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && onDateSelect(date)}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNextDate}
            data-testid="next-date-button"
            aria-label="Próximo dia"
            className="h-7 w-7 rounded-full"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

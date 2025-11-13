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
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-4xl font-bold text-primary">Estágios</h1>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrevDate}
          className="h-9 w-9 border-border hover:bg-muted hover:border-primary"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="min-w-[200px] justify-start text-left font-normal border-border hover:bg-muted hover:border-primary"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 glass-card" align="end">
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
          variant="outline"
          size="icon"
          onClick={onNextDate}
          className="h-9 w-9 border-border hover:bg-muted hover:border-primary"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

"use client"

import { useRef, useState } from "react"
import type { DragEvent, KeyboardEvent } from "react"
import { ClipboardCopy, Plus, Trash2, GripVertical, Check, X, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useQuickFill } from "@/hooks/use-quick-fill"
import type { QuickFillField } from "@/lib/types"

export function QuickFillPanel() {
  const { fields, loaded, addField, removeField, updateField, reorderFields } = useQuickFill()
  const [isOpen, setIsOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newValue, setNewValue] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editValue, setEditValue] = useState("")
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  function resetAddForm() {
    setNewLabel("")
    setNewValue("")
    setShowAddForm(false)
  }

  function handleAdd() {
    const label = newLabel.trim()
    const value = newValue.trim()

    if (!label || !value) return

    addField(label, value)
    resetAddForm()
  }

  function handleCopy(field: QuickFillField) {
    navigator.clipboard.writeText(field.value).then(() => {
      setCopiedId(field.id)
      window.setTimeout(() => setCopiedId(null), 2000)
    }).catch(() => {
      // Falha silenciosa se a API de clipboard estiver indisponível.
    })
  }

  function handleStartEdit(field: QuickFillField) {
    setEditingId(field.id)
    setEditLabel(field.label)
    setEditValue(field.value)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditLabel("")
    setEditValue("")
  }

  function handleSaveEdit() {
    if (!editingId) return

    const label = editLabel.trim()
    const value = editValue.trim()

    if (!label || !value) return

    updateField(editingId, { label, value })
    handleCancelEdit()
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, index: number) {
    dragItem.current = index
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", String(index))
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault()
    dragOverItem.current = index
  }

  function handleDrop() {
    if (dragItem.current === null || dragOverItem.current === null) return

    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null
      dragOverItem.current = null
      return
    }

    const reordered = [...fields]
    const [moved] = reordered.splice(dragItem.current, 1)

    if (!moved) {
      dragItem.current = null
      dragOverItem.current = null
      return
    }

    reordered.splice(dragOverItem.current, 0, moved)
    reorderFields(reordered)
    dragItem.current = null
    dragOverItem.current = null
  }

  function handleDragEnd() {
    dragItem.current = null
    dragOverItem.current = null
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") handleSaveEdit()
    if (event.key === "Escape") handleCancelEdit()
  }

  return (
    <>
      <button
        onClick={() => setIsOpen((value) => !value)}
        data-testid="quick-fill-toggle"
        aria-label="Abrir painel de dados pessoais"
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-50",
          "w-8 h-20 rounded-l-xl",
          "bg-gradient-to-b from-primary to-accent",
          "flex items-center justify-center",
          "shadow-lg shadow-primary/25",
          "transition-all duration-300 hover:w-10 hover:shadow-primary/40",
          isOpen && "opacity-0 pointer-events-none"
        )}
      >
        <ClipboardList className="w-4 h-4 text-white" />
      </button>

      <aside
        data-testid="quick-fill-panel"
        className={cn(
          "fixed right-0 top-0 h-screen z-50",
          "w-72 bg-sidebar border-l border-sidebar-border",
          "flex flex-col",
          "transition-transform duration-300 ease-in-out",
          "shadow-2xl shadow-black/40",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="absolute inset-0 mesh-bg pointer-events-none" />

        <div className="relative px-5 pt-5 pb-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
              <ClipboardList className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sidebar-primary text-sm font-bold">Dados Pessoais</p>
              <p className="text-sidebar-foreground/40 text-xs">Clique para copiar</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Fechar painel"
            className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors p-1 rounded-md hover:bg-sidebar-border/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative px-5 mb-1">
          <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
        </div>

        <div className="relative flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {loaded && fields.length === 0 && !showAddForm && (
            <div className="text-center py-8 px-4">
              <p className="text-sidebar-foreground/40 text-sm">Nenhum campo ainda.</p>
              <p className="text-sidebar-foreground/30 text-xs mt-1">Clique no botão + para adicionar seus dados.</p>
            </div>
          )}

          {fields.map((field, index) => (
            <div
              key={field.id}
              data-testid={`quick-fill-field-${field.id}`}
              draggable={editingId !== field.id}
              onDragStart={(event) => handleDragStart(event, index)}
              onDragOver={(event) => handleDragOver(event, index)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className={cn(
                "group rounded-xl border border-sidebar-border/60 bg-card/40",
                "backdrop-blur-sm transition-all duration-150",
                "hover:border-primary/30 hover:bg-card/60",
                editingId === field.id
                  ? "cursor-default"
                  : "cursor-grab active:cursor-grabbing active:opacity-60 active:scale-[0.98]"
              )}
            >
              {editingId === field.id ? (
                <div className="p-3 space-y-2">
                  <Input
                    value={editLabel}
                    onChange={(event) => setEditLabel(event.target.value)}
                    placeholder="Nome do campo"
                    className="h-7 text-xs bg-input border-border"
                    autoFocus
                    onKeyDown={handleEditKeyDown}
                  />
                  <Input
                    value={editValue}
                    onChange={(event) => setEditValue(event.target.value)}
                    placeholder="Valor"
                    className="h-7 text-xs bg-input border-border"
                    onKeyDown={handleEditKeyDown}
                  />
                  <div className="flex gap-1.5 justify-end">
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-6 px-2 text-xs">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} className="h-6 px-2 text-xs bg-primary">
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <GripVertical className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-sidebar-foreground/20 group-hover:text-sidebar-foreground/50 transition-all flex-shrink-0" />
                    <button
                      onClick={() => handleStartEdit(field)}
                      className="text-xs font-semibold text-sidebar-foreground/60 hover:text-primary transition-colors truncate flex-1 text-left"
                      title="Clique para editar"
                    >
                      {field.label}
                    </button>
                    <button
                      onClick={() => removeField(field.id)}
                      data-testid={`quick-fill-delete-${field.id}`}
                      aria-label={`Remover campo ${field.label}`}
                      className="text-sidebar-foreground/20 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Input
                      readOnly
                      value={field.value}
                      data-testid={`quick-fill-value-${field.id}`}
                      className="h-8 text-sm bg-input/60 border-border/60 text-foreground cursor-text flex-1"
                      onClick={(event) => event.currentTarget.select()}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopy(field)}
                      data-testid={`quick-fill-copy-${field.id}`}
                      aria-label={`Copiar ${field.label}`}
                      title="Copiar valor"
                      className={cn(
                        "h-8 w-8 flex-shrink-0 transition-all duration-200 rounded-lg",
                        copiedId === field.id
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-sidebar-foreground/40 hover:text-primary hover:bg-primary/10"
                      )}
                    >
                      {copiedId === field.id ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <ClipboardCopy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {showAddForm && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-primary mb-2">Novo campo</p>
              <Input
                value={newLabel}
                onChange={(event) => setNewLabel(event.target.value)}
                placeholder="Nome (ex: CPF)"
                className="h-8 text-sm bg-input border-border"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAdd()
                  if (event.key === "Escape") resetAddForm()
                }}
              />
              <Input
                value={newValue}
                onChange={(event) => setNewValue(event.target.value)}
                placeholder="Valor (ex: 123.456.789-00)"
                className="h-8 text-sm bg-input border-border"
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAdd()
                  if (event.key === "Escape") resetAddForm()
                }}
              />
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={resetAddForm} className="flex-1 h-8 text-xs">
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={!newLabel.trim() || !newValue.trim()}
                  className="flex-1 h-8 text-xs bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  Adicionar
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="relative px-5 mt-1">
          <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
        </div>

        <div className="relative px-4 py-4 flex justify-center flex-shrink-0">
          <button
            onClick={() => setShowAddForm(true)}
            data-testid="quick-fill-add-button"
            aria-label="Adicionar novo campo"
            disabled={showAddForm}
            className={cn(
              "w-11 h-11 rounded-full",
              "bg-gradient-to-br from-primary to-accent",
              "flex items-center justify-center",
              "shadow-lg shadow-primary/30 glow-primary",
              "transition-all duration-200",
              "hover:scale-110 hover:shadow-primary/50",
              "active:scale-95",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            )}
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}

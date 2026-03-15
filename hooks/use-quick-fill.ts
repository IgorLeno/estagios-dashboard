"use client"

import { useState, useEffect, useCallback } from "react"
import type { QuickFillField } from "@/lib/types"

const STORAGE_KEY = "estagios:quick-fill-fields"

const DEFAULT_FIELDS: Omit<QuickFillField, "id">[] = [
  { label: "Nome Completo", value: "", order: 0 },
  { label: "CPF", value: "", order: 1 },
  { label: "Data de Nascimento", value: "", order: 2 },
  { label: "CEP", value: "", order: 3 },
  { label: "Cidade", value: "", order: 4 },
]

function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === "x" ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export function useQuickFill() {
  const [fields, setFields] = useState<QuickFillField[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)

      if (raw) {
        const parsed = JSON.parse(raw) as QuickFillField[]
        setFields(parsed.sort((a, b) => a.order - b.order))
      } else {
        setFields(DEFAULT_FIELDS.map((field) => ({ ...field, id: uuidv4() })))
      }
    } catch {
      // Storage inacessível ou JSON inválido: manter estado inicial vazio.
    }

    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fields))
    } catch {
      // Falha silenciosa se o storage estiver indisponível.
    }
  }, [fields, loaded])

  const addField = useCallback((label: string, value: string) => {
    setFields((prev) => [...prev, { id: uuidv4(), label, value, order: prev.length }])
  }, [])

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((field) => field.id !== id).map((field, index) => ({ ...field, order: index })))
  }, [])

  const updateField = useCallback((id: string, patch: Partial<Pick<QuickFillField, "label" | "value">>) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, ...patch } : field)))
  }, [])

  const reorderFields = useCallback((newOrder: QuickFillField[]) => {
    setFields(newOrder.map((field, index) => ({ ...field, order: index })))
  }, [])

  return { fields, loaded, addField, removeField, updateField, reorderFields }
}

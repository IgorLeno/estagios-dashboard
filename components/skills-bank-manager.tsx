"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Database, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

/**
 * Skill from API
 */
interface Skill {
  id: string
  skill: string
  proficiency: "Básico" | "Intermediário" | "Avançado"
  category: "Linguagens & Análise de Dados" | "Ferramentas de Engenharia" | "Visualização & BI" | "Soft Skills"
  createdAt: string
}

/**
 * Proficiency levels with colors
 */
const PROFICIENCY_COLORS = {
  "Básico": "bg-blue-100 text-blue-800 border-blue-300",
  "Intermediário": "bg-purple-100 text-purple-800 border-purple-300",
  "Avançado": "bg-green-100 text-green-800 border-green-300",
} as const

/**
 * Available categories
 */
const CATEGORIES = [
  "Linguagens & Análise de Dados",
  "Ferramentas de Engenharia",
  "Visualização & BI",
  "Soft Skills",
] as const

/**
 * Proficiency levels
 */
const PROFICIENCY_LEVELS = ["Básico", "Intermediário", "Avançado"] as const

export function SkillsBankManager() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [adding, setAdding] = useState(false)

  // Form state
  const [newSkill, setNewSkill] = useState("")
  const [newProficiency, setNewProficiency] = useState<"Básico" | "Intermediário" | "Avançado">("Intermediário")
  const [newCategory, setNewCategory] = useState<typeof CATEGORIES[number]>("Linguagens & Análise de Dados")

  const supabase = createClient()

  // Load skills on mount
  useEffect(() => {
    loadSkills()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadSkills() {
    setLoading(true)
    try {
      const response = await fetch("/api/skills-bank")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to load skills")
      }

      setSkills(data.skills || [])
    } catch (error) {
      console.error("Error loading skills:", error)
      toast.error("Erro ao carregar skills")
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSkill(e: React.FormEvent) {
    e.preventDefault()

    if (!newSkill.trim()) {
      toast.error("Nome da skill é obrigatório")
      return
    }

    setAdding(true)
    try {
      const response = await fetch("/api/skills-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill: newSkill.trim(),
          proficiency: newProficiency,
          category: newCategory,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to add skill")
      }

      toast.success("Skill adicionada com sucesso!")
      setNewSkill("")
      setNewProficiency("Intermediário")
      setNewCategory("Linguagens & Análise de Dados")
      setShowAddForm(false)
      loadSkills()
    } catch (error: any) {
      console.error("Error adding skill:", error)
      toast.error(error.message || "Erro ao adicionar skill")
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveSkill(skillId: string, skillName: string) {
    if (!confirm(`Remover "${skillName}" do banco de skills?`)) {
      return
    }

    try {
      const response = await fetch(`/api/skills-bank?id=${skillId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to remove skill")
      }

      toast.success("Skill removida com sucesso!")
      loadSkills()
    } catch (error: any) {
      console.error("Error removing skill:", error)
      toast.error(error.message || "Erro ao remover skill")
    }
  }

  // Group skills by category
  const skillsByCategory = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = []
    }
    acc[skill.category].push(skill)
    return acc
  }, {} as Record<string, Skill[]>)

  if (loading) {
    return (
      <Card className="glass-card-intense">
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground animate-pulse">Carregando skills...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card-intense hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <span className="text-foreground">Banco de Skills</span>
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Gerencie suas habilidades técnicas para otimização ATS de currículos
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Skills list grouped by category */}
        {CATEGORIES.map((category) => {
          const categorySkills = skillsByCategory[category] || []

          if (categorySkills.length === 0) return null

          return (
            <div key={category} className="space-y-3">
              <h3 className="font-semibold text-foreground text-sm">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {categorySkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border"
                  >
                    <span className="text-sm font-medium text-foreground">{skill.skill}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${PROFICIENCY_COLORS[skill.proficiency]}`}
                    >
                      {skill.proficiency}
                    </Badge>
                    <button
                      onClick={() => handleRemoveSkill(skill.id, skill.skill)}
                      className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remover skill"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {skills.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma skill cadastrada ainda</p>
            <p className="text-xs mt-1">Adicione suas primeiras skills para começar</p>
          </div>
        )}

        {/* Add skill form */}
        {showAddForm ? (
          <form onSubmit={handleAddSkill} className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground text-sm">Adicionar Nova Skill</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                disabled={adding}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill-name">Nome da Skill</Label>
              <Input
                id="skill-name"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Ex: Python, Docker, ISO 17025"
                disabled={adding}
                className="bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="skill-category">Categoria</Label>
                <Select value={newCategory} onValueChange={(val) => setNewCategory(val as typeof CATEGORIES[number])} disabled={adding}>
                  <SelectTrigger id="skill-category" className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skill-proficiency">Proficiência</Label>
                <Select value={newProficiency} onValueChange={(val) => setNewProficiency(val as typeof PROFICIENCY_LEVELS[number])} disabled={adding}>
                  <SelectTrigger id="skill-proficiency" className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFICIENCY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={adding} className="flex-1">
                {adding ? "Adicionando..." : "Adicionar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} disabled={adding}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button onClick={() => setShowAddForm(true)} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Nova Skill
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

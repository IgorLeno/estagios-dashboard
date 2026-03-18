"use client"

import { LayoutDashboard, BarChart3, Settings2, LogOut, LogIn, Briefcase, User as UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

interface SidebarProps {
  activeTab?: string
  onTabChange?: (tab: string) => void
}

const menuItems = [
  { id: "vagas", label: "Estágios", icon: LayoutDashboard },
  { id: "resumo", label: "Resumo", icon: BarChart3 },
  { id: "perfil", label: "Perfil", icon: UserIcon },
  { id: "configuracoes", label: "Configurações", icon: Settings2 },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Check user auth status
  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    checkUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success("Logout realizado com sucesso")
      router.push("/admin/login")
      router.refresh()
    } catch (error) {
      toast.error("Erro ao fazer logout")
      console.error("Logout error:", error)
    }
  }

  const handleLogin = () => {
    router.push("/admin/login")
  }

  const handleItemClick = (itemId: string) => {
    if (itemId === "perfil") {
      router.push("/perfil")
      return
    }

    if (pathname !== "/") {
      const target = itemId === "vagas" ? "/" : `/?tab=${itemId}`
      router.push(target)
      return
    }

    onTabChange?.(itemId)
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar flex flex-col z-50 border-r border-sidebar-border">
      <div className="absolute inset-0 mesh-bg pointer-events-none" />

      <div className="relative px-5 pt-6 pb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 glow-primary">
          <Briefcase className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-sidebar-primary text-sm font-bold tracking-tight block">Estágios</span>
          <span className="text-sidebar-foreground/50 text-xs">Dashboard</span>
        </div>
      </div>

      <div className="relative px-5 mb-2">
        <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
      </div>

      <div className="relative px-5 mb-3 mt-3">
        <p className="text-sidebar-foreground/40 text-xs uppercase tracking-widest font-semibold">Navegação</p>
      </div>

      <nav className="relative flex-1 flex flex-col px-3 gap-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = item.id === "perfil" ? pathname === "/perfil" : activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              data-testid={`sidebar-${item.id}`}
              className={cn(
                "w-full h-10 rounded-lg flex items-center gap-3 px-3 transition-all duration-200 group relative",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                isActive
                  ? "bg-sidebar-accent/15 text-sidebar-accent"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-border/40"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-sidebar-accent rounded-full" />
              )}
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-transform duration-200",
                  isActive ? "text-sidebar-accent scale-110" : "group-hover:scale-105"
                )}
              />
              <span className={cn("text-sm font-medium", isActive && "font-semibold")}>{item.label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-accent opacity-80" />}
            </button>
          )
        })}
      </nav>

      <div className="relative px-5 mb-3">
        <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
      </div>

      <div className="relative px-3 pb-5">
        {loading ? (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/40 animate-pulse">Carregando...</div>
        ) : user ? (
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-border/30">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{user.email?.[0]?.toUpperCase() ?? "U"}</span>
              </div>
              <p className="text-xs text-sidebar-foreground/70 font-medium truncate flex-1">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start gap-2 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 h-9"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="text-sm">Sair</span>
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogin}
            className="w-full justify-start gap-2 text-sidebar-foreground/50 hover:text-sidebar-accent hover:bg-sidebar-accent/10 h-9"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span className="text-sm">Fazer Login</span>
          </Button>
        )}
      </div>
    </aside>
  )
}

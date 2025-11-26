"use client"

import { Briefcase, Star, Activity, LogOut, LogIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

interface SidebarProps {
  activeTab?: string
  onTabChange: (tab: string) => void
}

// Following reference design (2816023.jpg)
const menuItems = [
  { id: "vagas", label: "Estágios", icon: Briefcase },
  { id: "resumo", label: "Resumo", icon: Star },
  { id: "configuracoes", label: "Configurações", icon: Activity },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
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

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar flex flex-col py-6 z-50 border-r border-sidebar-border shadow-xl">
      {/* Logo/Brand */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xl font-bold">E</span>
        </div>
        <span className="text-sidebar-primary text-sm font-semibold">Dashboard Estágios</span>
      </div>

      {/* Menu Label */}
      <div className="px-6 mb-4">
        <p className="text-sidebar-foreground/60 text-xs uppercase tracking-wide font-medium">Menu</p>
        <div className="mt-2 h-px bg-sidebar-border/50" />
      </div>

      {/* Menu Items */}
      <nav className="flex-1 flex flex-col px-3 gap-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              data-testid={`sidebar-${item.id}`}
              className={cn(
                "w-full h-12 rounded-lg flex items-center gap-3 px-3 transition-all duration-200",
                "hover:bg-sidebar-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent",
                isActive
                  ? "bg-sidebar-accent/10 text-sidebar-accent border-l-4 border-sidebar-accent shadow-md"
                  : "text-sidebar-foreground border-l-4 border-transparent"
              )}
            >
              <Icon
                className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-sidebar-accent" : "text-sidebar-foreground")}
              />
              <span className={cn("text-sm font-medium", isActive ? "text-sidebar-accent" : "text-sidebar-foreground")}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Auth section at bottom */}
      <div className="px-3 mt-auto pt-4 border-t border-sidebar-border/50">
        {loading ? (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60">Carregando...</div>
        ) : user ? (
          <div className="space-y-2">
            <div className="px-3 py-1">
              <p className="text-xs text-sidebar-foreground/60">Logado como</p>
              <p className="text-sm text-sidebar-foreground font-medium truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-primary/10 hover:text-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogin}
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-primary/10 hover:text-sidebar-accent"
          >
            <LogIn className="h-4 w-4" />
            Fazer Login
          </Button>
        )}
      </div>
    </aside>
  )
}

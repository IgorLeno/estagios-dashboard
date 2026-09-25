"use client"

import { LayoutDashboard, BarChart3, Settings2, Briefcase, LogOut } from "lucide-react"
import { signOutAction } from "@/app/actions/auth"
import { cn } from "@/lib/utils"
import { usePathname, useRouter } from "next/navigation"

interface SidebarProps {
  activeTab?: string
  onTabChange?: (tab: string) => void
}

const menuItems = [
  { id: "vagas", label: "Estágios", icon: LayoutDashboard },
  { id: "resumo", label: "Resumo", icon: BarChart3 },
  { id: "configuracoes", label: "Configurações", icon: Settings2 },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleItemClick = (itemId: string) => {
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
          const isActive = activeTab === item.id
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

      <form action={signOutAction} className="relative px-3 pb-6">
        <button
          type="submit"
          data-testid="sidebar-sair"
          className={cn(
            "w-full h-10 rounded-lg flex items-center gap-3 px-3 transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-border/40"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">Sair</span>
        </button>
      </form>
    </aside>
  )
}

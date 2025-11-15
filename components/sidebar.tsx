"use client"

import { Search, Heart, Star, Activity, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  activeTab?: string
  onTabChange: (tab: string) => void
}

// Following reference design (2816023.jpg)
const menuItems = [
  { id: "search", label: "Buscar", icon: Search },
  { id: "vagas", label: "Vagas", icon: Heart },
  { id: "resumo", label: "Resumo", icon: Star },
  { id: "configuracoes", label: "Configurações", icon: Activity },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
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
    </aside>
  )
}

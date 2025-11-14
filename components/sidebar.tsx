"use client"

import { LayoutDashboard, Briefcase, TrendingUp, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  activeTab?: string
  onTabChange: (tab: string) => void
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "vagas", label: "Vagas", icon: Briefcase },
  { id: "resumo", label: "Resumo", icon: TrendingUp },
  { id: "configuracoes", label: "Configurações", icon: Settings },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-20 bg-primary flex flex-col items-center py-6 gap-8 z-50">
      {/* Logo/Title */}
      <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
        <span className="text-white text-xl font-bold">E</span>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 flex flex-col items-center gap-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              aria-label={item.label}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200",
                "hover:bg-white/10",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
                isActive ? "bg-white text-primary shadow-lg" : "text-white"
              )}
              title={item.label}
            >
              <Icon className="w-6 h-6 text-current" />
            </button>
          )
        })}
      </nav>

      {/* Logout (future feature) */}
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="w-12 h-12 rounded-lg flex items-center justify-center text-white/40 opacity-50 cursor-not-allowed transition-all duration-200"
        title="Logout (disabled)"
      >
        <LogOut className="w-6 h-6" />
      </button>
    </aside>
  )
}

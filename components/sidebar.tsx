"use client"

import { LayoutDashboard, Briefcase, TrendingUp, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const menuItems = [
  { id: "estagios", label: "Dashboard", icon: LayoutDashboard },
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
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200",
                "hover:bg-white/10",
                isActive && "bg-white text-primary shadow-lg"
              )}
              title={item.label}
            >
              <Icon className={cn("w-6 h-6", isActive ? "text-primary" : "text-white")} />
            </button>
          )
        })}
      </nav>

      {/* Logout (future feature) */}
      <button
        className="w-12 h-12 rounded-lg flex items-center justify-center text-white hover:bg-white/10 transition-all duration-200"
        title="Logout"
      >
        <LogOut className="w-6 h-6" />
      </button>
    </aside>
  )
}

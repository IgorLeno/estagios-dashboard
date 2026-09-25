"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ListChecks, Settings2, Briefcase, LogOut } from "lucide-react"
import { signOutAction } from "@/app/actions/auth"
import { cn } from "@/lib/utils"

const menuItems = [
  { id: "visao-geral", href: "/", label: "Visão geral", icon: LayoutDashboard },
  { id: "vagas", href: "/vagas", label: "Vagas", icon: ListChecks },
  { id: "configuracoes", href: "/configuracoes", label: "Configurações", icon: Settings2 },
]

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  // A job page belongs to the list section.
  if (href === "/vagas") return pathname.startsWith("/vagas") || pathname.startsWith("/vaga/")
  return pathname.startsWith(href)
}

// No prefetch, as on the overview links: every dashboard page is a full dynamic render.

/** Fixed sidebar on large screens; a compact top bar with the same links below `lg`. */
export function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar z-50 lg:flex">
        <div className="absolute inset-0 mesh-bg pointer-events-none" />

        <div className="relative px-5 pt-6 pb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 glow-primary">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sidebar-primary text-sm font-bold tracking-tight block">Estágios</span>
            <span className="text-sidebar-foreground/70 text-xs">Painel do job-search</span>
          </div>
        </div>

        <div className="relative px-5 mb-2">
          <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
        </div>

        <nav aria-label="Navegação principal" className="relative flex-1 flex flex-col px-3 gap-0.5 mt-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(pathname, item.href)
            return (
              <Link
                prefetch={false}
                key={item.id}
                href={item.href}
                data-testid={`sidebar-${item.id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "w-full h-10 rounded-lg flex items-center gap-3 px-3 transition-colors duration-200 relative",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  active
                    ? "bg-sidebar-accent/15 text-sidebar-accent"
                    : "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-border/40"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-sidebar-accent rounded-full" />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className={cn("text-sm font-medium", active && "font-semibold")}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <form action={signOutAction} className="relative px-3 pb-6">
          <button
            type="submit"
            data-testid="sidebar-sair"
            className={cn(
              "w-full h-10 rounded-lg flex items-center gap-3 px-3 transition-colors duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-border/40"
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </form>
      </aside>

      <header className="sticky top-0 z-50 border-b border-sidebar-border bg-sidebar lg:hidden">
        <div className="flex items-center gap-2 px-4 pt-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Briefcase className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          </div>
          <span className="text-sidebar-primary text-sm font-bold">Estágios</span>
          <form action={signOutAction} className="ml-auto">
            <button
              type="submit"
              data-testid="mobile-sair"
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-sidebar-foreground hover:text-sidebar-primary"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              Sair
            </button>
          </form>
        </div>
        <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto px-3 py-2">
          {menuItems.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                prefetch={false}
                key={item.id}
                href={item.href}
                data-testid={`mobile-nav-${item.id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm",
                  active
                    ? "bg-sidebar-accent/20 text-sidebar-accent font-semibold"
                    : "text-sidebar-foreground hover:text-sidebar-primary"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>
    </>
  )
}

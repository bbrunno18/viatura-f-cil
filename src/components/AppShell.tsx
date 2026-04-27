import { Link, useLocation } from "@tanstack/react-router";
import { Home, LogOut, FileSpreadsheet, Fuel, Users, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/app/abastecimentos", label: "Abast.", icon: Fuel },
  { to: "/app/condutores", label: "Condutores", icon: Users },
  { to: "/app/historico", label: "Histórico", icon: FileSpreadsheet },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-gradient-hero text-sidebar-foreground safe-top sticky top-0 z-30 shadow-elegant">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-accent flex items-center justify-center shadow-card">
              <Shield className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-base">FrotaCop</div>
              <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/70">
                Controle de Viaturas
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/app/admin"
                className="hidden sm:inline-flex items-center gap-1 rounded-full bg-accent/20 border border-accent/40 px-3 py-1 text-xs font-semibold text-accent"
              >
                ADMIN
              </Link>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={signOut}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Sair"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {user && (
          <div className="max-w-2xl mx-auto px-4 pb-2 text-xs text-sidebar-foreground/80 truncate">
            {user.email}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-28">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border safe-bottom">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {navItems.map((item) => {
            const active =
              item.to === "/app"
                ? location.pathname === "/app"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

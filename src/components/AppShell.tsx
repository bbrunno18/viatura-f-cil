import { Link, useLocation } from "@tanstack/react-router";
import { Home, LogOut, Fuel, Users, Settings, Sun, Moon, Car, QrCode, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { usePreferences } from "@/lib/preferences";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoMJ from "@/assets/logo-mj.png";
import { DevCredit } from "@/components/DevCredit";
import { useSecao } from "@/hooks/useSecao";

const navLeft = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/app/viaturas", label: "Viaturas", icon: Car },
];
const navRight = [
  { to: "/app/abastecimentos", label: "Abast.", icon: Fuel },
  { to: "/app/condutores", label: "Condutores", icon: Users },
];

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isMaster, signOut } = useAuth();
  const { theme, setTheme } = usePreferences();
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const roleLabel = isMaster ? "Administrador Master" : isAdmin ? "Administrador" : "Condutor";
  const roleClass = isMaster
    ? "bg-accent/30 border-accent/60 text-accent"
    : isAdmin
    ? "bg-primary/20 border-primary/40 text-sidebar-foreground"
    : "bg-sidebar-foreground/10 border-sidebar-foreground/20 text-sidebar-foreground/90";
  const location = useLocation();
  const online = useOnline();
  const { secao } = useSecao();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-gradient-hero bg-hero-pattern text-sidebar-foreground safe-top sticky top-0 z-30 shadow-elegant border-b border-accent/30">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2">
            <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center shadow-card overflow-hidden ring-2 ring-accent/60">
              <img src={logoMJ} alt="Easy Patrol" className="h-full w-full object-cover" />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-base">
                Easy Patrol
              </div>
              <div className="max-w-[11rem] truncate text-[10px] uppercase tracking-widest text-accent">
                {secao || "Controle de Viaturas"}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
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
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Alternar tema"
            >
              {isDark ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}
            </Button>
            <Link to="/app/preferencias" aria-label="Preferências">
              <Button size="icon" variant="ghost" className="text-sidebar-foreground hover:bg-sidebar-accent">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
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
          <div className="max-w-2xl mx-auto px-4 pb-2 flex items-center justify-between gap-2 text-xs text-sidebar-foreground/80">
            <span className="truncate">{user.email}</span>
            <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", roleClass)}>
              {roleLabel}
            </span>
          </div>
        )}
      </header>

      {!online && (
        <div role="status" className="bg-destructive text-destructive-foreground text-xs font-medium py-1.5 px-4 flex items-center justify-center gap-2">
          <WifiOff className="h-3.5 w-3.5" /> Sem conexão com a internet. Os registros só serão salvos quando voltar.
        </div>
      )}

      {/* Main */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-32">
        {children}
        <DevCredit className="mt-10 text-muted-foreground" />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 glass border-t border-border safe-bottom shadow-[0_-8px_24px_-16px_rgba(0,0,0,.25)]" aria-label="Navegação principal">
        <div className="max-w-2xl mx-auto grid grid-cols-5 items-end">
          {navLeft.map((item) => <NavLink key={item.to} item={item} pathname={location.pathname} />)}
          <Link
            to="/app/saida"
            aria-label="Nova saída: escanear QR Code da viatura"
            className="flex flex-col items-center gap-1 pb-2 text-[11px] font-semibold text-primary"
          >
            <span className="-mt-6 h-14 w-14 rounded-full bg-gradient-accent text-accent-foreground shadow-elegant ring-4 ring-background flex items-center justify-center transition-transform active:scale-95">
              <QrCode className="h-6 w-6" />
            </span>
            Escanear
          </Link>
          {navRight.map((item) => <NavLink key={item.to} item={item} pathname={location.pathname} />)}
        </div>
      </nav>
    </div>
  );
}

function NavLink({ item, pathname }: { item: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }; pathname: string }) {
  const active = item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors press",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className={cn("relative flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary/12")}>
        <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
      </span>
      {item.label}
    </Link>
  );
}

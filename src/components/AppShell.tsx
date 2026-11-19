import { Link, useLocation } from "@tanstack/react-router";
import { Home, LogOut, Fuel, Users, Settings, Sun, Moon, Car, QrCode, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { usePreferences } from "@/lib/preferences";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoEP from "@/assets/logo-easy-patrol.png";
import { DevCredit } from "@/components/DevCredit";

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
  const { user, isAdmin, isMaster, signOut, orgNome, orgLogo } = useAuth();
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-gradient-hero bg-hero-pattern text-sidebar-foreground safe-top sticky top-0 z-30 shadow-elegant border-b border-accent/30">
        <div className="max-w-2xl mx-auto px-3 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Esquerda: logo da empresa */}
          <Link to="/app" className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center overflow-hidden ring-1 ring-accent/50 shadow-card",
              orgLogo && "bg-white p-1",
            )}>
              <img src={orgLogo || logoEP} alt={orgNome || "Easy Patrol"} className={cn("h-full w-full", orgLogo ? "object-contain" : "object-cover")} />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display font-bold text-sm">{orgNome || "Easy Patrol"}</div>
              {!orgNome && <div className="truncate text-[10px] uppercase tracking-widest text-accent">Controle de Viaturas</div>}
            </div>
          </Link>

          {/* Centro: selos de perfil */}
          <div className="flex flex-col items-center gap-1">
            {isAdmin && (
              <Link
                to="/app/admin"
                className="inline-flex items-center rounded-full bg-accent/20 border border-accent/40 px-3 py-0.5 text-[11px] font-bold tracking-wider text-accent"
              >
                ADMIN
              </Link>
            )}
            <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap", roleClass)}>
              {roleLabel}
            </span>
          </div>

          {/* Direita: ações */}
          <div className="flex items-center justify-end">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Alternar tema"
            >
              {isDark ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}
            </Button>
            <Link to="/app/preferencias" aria-label="Preferências">
              <Button size="icon" variant="ghost" className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="icon"
              variant="ghost"
              onClick={signOut}
              className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Sair"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {user && (
          <div className="max-w-2xl mx-auto px-4 pb-1.5 text-center text-[11px] text-sidebar-foreground/70 truncate">
            {user.email}
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
        <div className="mt-10 flex items-center justify-center gap-2 text-muted-foreground">
          <img src={logoEP} alt="" className="h-5 w-5 rounded-md" />
          <span className="text-xs font-semibold tracking-wide">Easy Patrol</span>
        </div>
        <DevCredit className="mt-3 text-muted-foreground" />
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

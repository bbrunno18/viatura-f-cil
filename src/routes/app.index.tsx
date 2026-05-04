import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Car, Fuel, Plus, Clock, AlertTriangle, ArrowRight, ClipboardList,
  ShieldCheck, Map, CalendarClock, Wrench, BarChart3, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { aprovado, profileLoaded, isAdmin, isMaster, user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [vRes, abertasRes, manutRes, reservasRes] = await Promise.all([
        supabase.from("viaturas").select("id", { count: "exact", head: true }).eq("ativa", true),
        supabase.from("utilizacoes").select("id", { count: "exact", head: true }).is("data_retorno", null),
        supabase.from("manutencoes").select("proxima_data").not("proxima_data", "is", null),
        supabase.from("reservas").select("id", { count: "exact", head: true }).eq("status", "agendada"),
      ]);
      const total = vRes.count ?? 0;
      const emUso = abertasRes.count ?? 0;
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const vencidas = (manutRes.data ?? []).filter((m: any) => new Date(m.proxima_data) <= hoje).length;
      return { total, emUso, livres: Math.max(total - emUso, 0), vencidas, reservas: reservasRes.count ?? 0 };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel da Frota</h1>
        <p className="text-sm text-muted-foreground">Olá{user ? `, ${user.email?.split("@")[0]}` : ""}. Selecione uma ação abaixo.</p>
      </div>

      {profileLoaded && !aprovado && (
        <Card className="p-4 bg-warning/10 border-warning/40 flex gap-3 items-start">
          <Clock className="h-5 w-5 text-warning-foreground shrink-0 mt-0.5"/>
          <div className="text-sm">
            <div className="font-semibold">Conta pendente de aprovação</div>
            <div className="text-muted-foreground">Você só poderá registrar saídas, retornos e abastecimentos após o administrador aprovar.</div>
          </div>
        </Card>
      )}

      {(stats?.vencidas ?? 0) > 0 && (
        <Link to="/app/manutencao">
          <Card className="p-4 bg-destructive/10 border-destructive/40 flex gap-3 items-start hover:shadow-elegant transition-shadow">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5"/>
            <div className="text-sm flex-1">
              <div className="font-semibold">{stats?.vencidas} manutenção(ões) vencida(s)</div>
              <div className="text-muted-foreground">Toque para ver os detalhes.</div>
            </div>
            <ArrowRight className="h-4 w-4 text-destructive mt-0.5"/>
          </Card>
        </Link>
      )}

      {/* Hero — Viaturas disponíveis */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/app/disponiveis">
          <Card className="relative overflow-hidden border-0 shadow-elegant bg-gradient-hero text-sidebar-foreground p-5 group">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-accent/15 blur-2xl" />
            <div className="absolute -right-2 -bottom-8 h-24 w-24 rounded-full bg-primary-foreground/5 blur-xl" />
            <div className="relative flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0">
                <Car className="h-7 w-7 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/70">Frota</div>
                <div className="font-display font-bold text-xl leading-tight">Viaturas Disponíveis</div>
                <div className="text-xs text-sidebar-foreground/80 mt-0.5">Status, saída e retorno</div>
              </div>
              <div className="grid grid-cols-3 gap-2 pr-1">
                <Stat n={stats?.total} label="Frota" />
                <Stat n={stats?.livres} label="Livres" tone="success" />
                <Stat n={stats?.emUso} label="Uso" tone="warning" />
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* Operação */}
      <Section title="Operação">
        <div className="grid grid-cols-2 gap-3">
          <ActionTile to="/app/saida" icon={Plus} label="Nova Saída" desc="Iniciar uso de viatura" tone="primary" />
          <ActionTile to="/app/abastecimentos/novo" icon={Fuel} label="Abastecer" desc="Registrar abastecimento" tone="accent" />
          <ActionTile to="/app/reservas" icon={CalendarClock} label="Reservas" desc={`${stats?.reservas ?? 0} agendada(s)`} tone="neutral" />
          <ActionTile to="/app/incidentes" icon={AlertTriangle} label="Incidentes" desc="Registrar ocorrência" tone="destructive" />
        </div>
      </Section>

      {/* Visão geral */}
      <Section title="Visão geral">
        <div className="grid grid-cols-2 gap-3">
          <ActionTile to="/app/mapa" icon={Map} label="Mapa ao vivo" desc="Última posição GPS" tone="primary" />
          <ActionTile to="/app/relatorios" icon={BarChart3} label="Relatórios" desc="Gráficos e exportação" tone="accent" />
          <ActionTile to="/app/historico" icon={ClipboardList} label="Histórico" desc="Utilizações anteriores" tone="neutral" />
          <ActionTile to="/app/manutencao" icon={Wrench} label="Manutenção" desc="Revisões e vencimentos" tone="neutral" />
        </div>
      </Section>

      {/* Admin */}
      {isAdmin && (
        <Section title="Administração">
          <div className="grid grid-cols-1 gap-3">
            <Link to="/app/admin">
              <Card className="p-4 flex items-center gap-3 shadow-card hover:shadow-elegant transition-all hover:-translate-y-0.5">
                <div className="h-11 w-11 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Painel Administrativo</div>
                  <div className="text-xs text-muted-foreground">Usuários, papéis e aprovações</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Card>
            </Link>
            {isMaster && (
              <Link to="/app/auditoria">
                <Card className="p-4 flex items-center gap-3 shadow-card hover:shadow-elegant transition-all hover:-translate-y-0.5">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Auditoria</div>
                    <div className="text-xs text-muted-foreground">Log de ações dos usuários</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Card>
              </Link>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-2">{title}</div>
      {children}
    </div>
  );
}

function Stat({ n, label, tone }: { n?: number; label: string; tone?: "success" | "warning" }) {
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-accent" : "text-sidebar-foreground";
  return (
    <div className="text-center">
      <div className={`font-display font-bold text-lg leading-none ${color}`}>{n ?? "—"}</div>
      <div className="text-[9px] uppercase tracking-wider text-sidebar-foreground/60 mt-0.5">{label}</div>
    </div>
  );
}

function ActionTile({
  to, icon: Icon, label, desc, tone,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  tone: "primary" | "accent" | "destructive" | "neutral";
}) {
  const styles = {
    primary: "bg-gradient-primary text-primary-foreground border-0",
    accent: "bg-gradient-accent text-accent-foreground border-0",
    destructive: "bg-card border-destructive/30 text-foreground",
    neutral: "bg-card border-border text-foreground",
  }[tone];
  const iconWrap = {
    primary: "bg-primary-foreground/15 text-primary-foreground",
    accent: "bg-accent-foreground/15 text-accent-foreground",
    destructive: "bg-destructive/10 text-destructive",
    neutral: "bg-secondary text-primary",
  }[tone];

  return (
    <Link to={to as any}>
      <Card className={`p-4 h-full shadow-card hover:shadow-elegant transition-all hover:-translate-y-0.5 active:translate-y-0 ${styles}`}>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${iconWrap}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="font-semibold text-sm leading-tight">{label}</div>
        <div className="text-[11px] opacity-80 mt-0.5">{desc}</div>
      </Card>
    </Link>
  );
}

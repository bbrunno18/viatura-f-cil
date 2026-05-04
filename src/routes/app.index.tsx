import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Car, Fuel, Plus, Clock, AlertTriangle, ArrowRight, ClipboardList, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { aprovado, profileLoaded, isAdmin } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [vRes, abertasRes] = await Promise.all([
        supabase.from("viaturas").select("id", { count: "exact", head: true }).eq("ativa", true),
        supabase.from("utilizacoes").select("id", { count: "exact", head: true }).is("data_retorno", null),
      ]);
      const total = vRes.count ?? 0;
      const emUso = abertasRes.count ?? 0;
      return { total, emUso, livres: Math.max(total - emUso, 0) };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel da Frota</h1>
        <p className="text-sm text-muted-foreground">Bem-vindo. Selecione uma ação para começar.</p>
      </div>

      {profileLoaded && !aprovado && (
        <Card className="p-4 bg-warning/10 border-warning/40 flex gap-3 items-start">
          <Clock className="h-5 w-5 text-warning-foreground shrink-0 mt-0.5"/>
          <div className="text-sm">
            <div className="font-semibold">Conta pendente de aprovação</div>
            <div className="text-muted-foreground">Você só poderá registrar saídas, retornos e abastecimentos após o administrador aprovar sua conta.</div>
          </div>
        </Card>
      )}

      {/* Snapshot da frota */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center shadow-card">
          <div className="text-2xl font-bold text-primary">{stats?.total ?? "—"}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Frota ativa</div>
        </Card>
        <Card className="p-3 text-center shadow-card">
          <div className="text-2xl font-bold text-success">{stats?.livres ?? "—"}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Disponíveis</div>
        </Card>
        <Card className="p-3 text-center shadow-card">
          <div className="text-2xl font-bold text-warning-foreground">{stats?.emUso ?? "—"}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Em uso</div>
        </Card>
      </div>

      {/* Botão principal — Viaturas disponíveis */}
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
                <div className="text-xs text-sidebar-foreground/80 mt-0.5">Veja status, registre saída e retorno</div>
              </div>
              <ArrowRight className="h-5 w-5 text-accent transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* Ações primárias */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Ações rápidas</div>
        <div className="grid grid-cols-2 gap-3">
          <ActionTile to="/app/saida" icon={Plus} label="Nova Saída" desc="Registrar utilização" tone="primary" />
          <ActionTile to="/app/abastecimentos/novo" icon={Fuel} label="Abastecer" desc="Novo abastecimento" tone="accent" />
          <ActionTile to="/app/incidentes" icon={AlertTriangle} label="Incidentes" desc="Registrar ocorrências" tone="destructive" />
          <ActionTile to="/app/historico" icon={ClipboardList} label="Histórico" desc="Utilizações anteriores" tone="neutral" />
        </div>
      </div>

      {/* Admin */}
      {isAdmin && (
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Administração</div>
          <Link to="/app/admin">
            <Card className="p-4 flex items-center gap-3 shadow-card hover:shadow-elegant transition-shadow">
              <div className="h-11 w-11 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Painel Administrativo</div>
                <div className="text-xs text-muted-foreground">Usuários, papéis e auditoria</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Card>
          </Link>
        </div>
      )}
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
      <Card className={`p-4 h-full shadow-card hover:shadow-elegant transition-all hover:-translate-y-0.5 ${styles}`}>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${iconWrap}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-[11px] opacity-80">{desc}</div>
      </Card>
    </Link>
  );
}

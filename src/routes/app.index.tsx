import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Car, Fuel, Plus, Clock, AlertTriangle, ArrowRight, ClipboardList,
  ShieldCheck, Users, MapPin, ExternalLink, CalendarClock, Wrench, BarChart3, Activity, FileWarning, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { greeting } from "@/lib/format";

import { parseDateOnly } from "@/lib/format";
export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { aprovado, profileLoaded, isAdmin, isMaster, user } = useAuth();
  const rawName = (user?.user_metadata?.nome as string | undefined) || user?.email?.split("@")[0] || "";
  const firstName = rawName
    .split(/[.\s_-]+/)[0]
    .replace(/^./, (c) => c.toUpperCase());

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
      const vencidas = (manutRes.data ?? []).filter((m: any) => (parseDateOnly(m.proxima_data) ?? hoje) <= hoje).length;
      return { total, emUso, livres: Math.max(total - emUso, 0), vencidas, reservas: reservasRes.count ?? 0 };
    },
  });

  const { data: ao_vivo } = useQuery({
    queryKey: ["dashboard-ao-vivo"],
    refetchInterval: 15000,
    queryFn: async () => {
      const desde = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      const { data } = await (supabase as any)
        .from("viatura_posicao")
        .select("latitude, longitude, atualizado_em")
        .gte("atualizado_em", desde)
        .order("atualizado_em", { ascending: false });
      return (data ?? []) as { latitude: number; longitude: number }[];
    },
  });
  const nAoVivo = ao_vivo?.length ?? 0;
  const primeira = ao_vivo?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Painel da Frota</h1>
        <p className="text-sm text-muted-foreground">
          {greeting()}{firstName ? `, ${firstName}` : ""}. Selecione uma ação abaixo.
        </p>
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
        <Link to="/app/manutencao" className="block">
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
        <Link to="/app/disponiveis" className="block">
          <Card className="relative overflow-hidden border-0 shadow-elegant bg-gradient-hero bg-hero-pattern text-sidebar-foreground p-5 group press">
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
              <ArrowRight className="h-5 w-5 text-sidebar-foreground/60 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="relative mt-4 grid grid-cols-3 divide-x divide-sidebar-foreground/15 rounded-xl bg-black/15 py-2.5">
              <Stat n={stats?.total} label="Na frota" />
              <Stat n={stats?.livres} label="Livres" tone="success" />
              <Stat n={stats?.emUso} label="Em uso" tone="warning" />
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* Localização ao vivo */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="relative overflow-hidden p-4 shadow-elegant border-accent/30 bg-card">
          <div className="absolute -left-8 -bottom-10 h-28 w-28 rounded-full bg-accent/10 blur-2xl" />
          <Link to="/app/mapa" className="relative flex items-center gap-3.5 press">
            <div className="relative h-14 w-14 shrink-0">
              {nAoVivo > 0 && <span className="absolute inset-0 rounded-2xl bg-accent/30 animate-ping" />}
              <div className="relative h-14 w-14 rounded-2xl bg-gradient-accent text-accent-foreground flex items-center justify-center shadow-card">
                <MapPin className="h-7 w-7" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Localização</div>
              <div className="font-display font-bold text-lg leading-tight">Onde está a frota agora</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${nAoVivo > 0 ? "bg-success animate-pulse" : "bg-muted-foreground/40"}`} />
                {nAoVivo > 0 ? `${nAoVivo} viatura${nAoVivo > 1 ? "s" : ""} ao vivo` : "Nenhuma viatura em movimento"}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </Link>
          {primeira && (
            <a
              href={`https://www.google.com/maps?q=${primeira.latitude},${primeira.longitude}`}
              target="_blank" rel="noreferrer"
              className="relative mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/60 py-2 text-xs font-semibold text-primary press"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir no Google Maps
            </a>
          )}
        </Card>
      </motion.div>

      {/* Operação */}
      <Section title="Operação">
        <div className="grid grid-cols-2 gap-3">
          <ActionTile to="/app/saida" icon={Plus} label="Nova Saída" desc="Escaneie o QR da viatura" tone="primary" />
          <ActionTile to="/app/abastecimentos/novo" icon={Fuel} label="Abastecer" desc="Registrar abastecimento" tone="accent" />
          <ActionTile to="/app/reservas" icon={CalendarClock} label="Reservas" desc={`${stats?.reservas ?? 0} agendada(s)`} tone="neutral" />
          <ActionTile to="/app/incidentes" icon={AlertTriangle} label="Incidentes" desc="Registrar ocorrência" tone="destructive" />
        </div>
      </Section>

      {/* Visão geral */}
      <Section title="Visão geral">
        <div className="grid grid-cols-2 gap-3">
          <ActionTile to="/app/relatorios" icon={BarChart3} label="Relatórios" desc="Gráficos e exportação" tone="accent" />
          <ActionTile to="/app/historico" icon={ClipboardList} label="Histórico" desc="Utilizações anteriores" tone="neutral" />
          <ActionTile to="/app/manutencao" icon={Wrench} label="Manutenção" desc="Revisões e vencimentos" tone="neutral" />
          <ActionTile to="/app/documentos" icon={FileText} label="Documentos" desc="CRLV, seguro, IPVA" tone="neutral" />
          <ActionTile to="/app/multas" icon={FileWarning} label="Multas" desc="Infrações registradas" tone="destructive" />
          <ActionTile to="/app/viaturas" icon={Car} label="Viaturas" desc={isAdmin ? "Cadastro e QR Codes" : "Frota cadastrada"} tone="neutral" />
          <ActionTile to="/app/condutores" icon={Users} label="Condutores" desc="Fichas e validade da CNH" tone="neutral" wide />
        </div>
      </Section>

      {/* Admin */}
      {isAdmin && (
        <Section title="Administração">
          <div className="grid grid-cols-1 gap-3">
            <Link to="/app/admin" className="block">
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
              <>
                <Link to="/app/dashboard" className="block">
                  <Card className="p-4 flex items-center gap-3 shadow-card hover:shadow-elegant transition-all hover:-translate-y-0.5 bg-gradient-hero text-sidebar-foreground border-0">
                    <div className="h-11 w-11 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">Dashboard Executivo</div>
                      <div className="text-xs text-sidebar-foreground/80">KPIs, gráficos e custos consolidados</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-sidebar-foreground/70" />
                  </Card>
                </Link>
                <Link to="/app/auditoria" className="block">
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
              </>
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
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-2.5"><span className="h-3 w-1 rounded-full bg-accent" />{title}</div>
      {children}
    </div>
  );
}

function Stat({ n, label, tone }: { n?: number; label: string; tone?: "success" | "warning" }) {
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-accent" : "text-sidebar-foreground";
  return (
    <div className="text-center">
      <div className={`font-display font-bold text-3xl leading-none tabular ${color}`}>{n ?? <span className="inline-block h-5 w-6 rounded bg-sidebar-foreground/15 animate-pulse" />}</div>
      <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/65 mt-1">{label}</div>
    </div>
  );
}

function ActionTile({
  to, icon: Icon, label, desc, tone, wide,
}: {
  wide?: boolean;
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
    <Link to={to as any} className={`block h-full ${wide ? "col-span-2" : ""}`}>
      <Card className={`p-4 h-full shadow-card hover:shadow-elegant transition-all hover:-translate-y-0.5 press ${styles}`}>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${iconWrap}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="font-semibold text-sm leading-tight">{label}</div>
        <div className="text-[11px] opacity-80 mt-0.5">{desc}</div>
      </Card>
    </Link>
  );
}

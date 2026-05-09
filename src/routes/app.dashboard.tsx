import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, TrendingUp, Fuel, AlertTriangle, Wrench, FileWarning, Users, Car,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardExec,
});

function DashboardExec() {
  const { isMaster, profileLoaded } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dash-exec"],
    enabled: isMaster,
    queryFn: async () => {
      const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1); since.setHours(0,0,0,0);
      const [vias, util, abast, inc, manut, multas, cond] = await Promise.all([
        supabase.from("viaturas").select("id, modelo, placa, ativa"),
        supabase.from("utilizacoes").select("id, viatura_id, data_saida, data_retorno, km_inicial, km_final").gte("data_saida", since.toISOString()),
        supabase.from("abastecimentos").select("id, viatura_id, valor_total, litros, data_abastecimento").gte("data_abastecimento", since.toISOString()),
        supabase.from("incidentes").select("id, data_ocorrencia").gte("data_ocorrencia", since.toISOString()),
        supabase.from("manutencoes").select("id, proxima_data, custo"),
        supabase.from("multas").select("id, valor, situacao"),
        supabase.from("condutores").select("id, cnh_validade"),
      ]);

      const meses: { mes: string; abast: number; util: number }[] = [];
      const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { month: "short" });
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
        const key = d.toISOString().slice(0, 7);
        const ab = (abast.data ?? []).filter((a: any) => a.data_abastecimento.slice(0, 7) === key)
          .reduce((s: number, a: any) => s + Number(a.valor_total ?? 0), 0);
        const ut = (util.data ?? []).filter((u: any) => u.data_saida.slice(0, 7) === key).length;
        meses.push({ mes: fmt(d), abast: Math.round(ab), util: ut });
      }

      const porViatura: Record<string, number> = {};
      (util.data ?? []).forEach((u: any) => { porViatura[u.viatura_id] = (porViatura[u.viatura_id] ?? 0) + 1; });
      const topViaturas = Object.entries(porViatura)
        .map(([id, n]) => {
          const v: any = (vias.data ?? []).find((x: any) => x.id === id);
          return { nome: v ? `${v.modelo} ${v.placa ?? ""}`.trim() : "—", usos: n };
        })
        .sort((a, b) => b.usos - a.usos).slice(0, 5);

      const hoje = new Date(); hoje.setHours(0,0,0,0);
      const em30 = new Date(hoje); em30.setDate(em30.getDate() + 30);
      const manutVenc = (manut.data ?? []).filter((m: any) => m.proxima_data && new Date(m.proxima_data) <= hoje).length;
      const cnhVenc = (cond.data ?? []).filter((c: any) => c.cnh_validade && new Date(c.cnh_validade) <= em30).length;

      const totalAbast = (abast.data ?? []).reduce((s: number, a: any) => s + Number(a.valor_total ?? 0), 0);
      const totalLitros = (abast.data ?? []).reduce((s: number, a: any) => s + Number(a.litros ?? 0), 0);
      const totalManut = (manut.data ?? []).reduce((s: number, m: any) => s + Number(m.custo ?? 0), 0);
      const totalMultas = (multas.data ?? []).reduce((s: number, m: any) => s + Number(m.valor ?? 0), 0);

      const distribuicao = [
        { name: "Combustível", value: Math.round(totalAbast) },
        { name: "Manutenção", value: Math.round(totalManut) },
        { name: "Multas", value: Math.round(totalMultas) },
      ].filter((d) => d.value > 0);

      return {
        kpi: {
          frota: (vias.data ?? []).filter((v: any) => v.ativa).length,
          utilSemestre: (util.data ?? []).length,
          incSemestre: (inc.data ?? []).length,
          manutVenc, cnhVenc,
          totalAbast, totalLitros, totalManut, totalMultas,
          multasAbertas: (multas.data ?? []).filter((m: any) => m.situacao === "aberta").length,
        },
        meses, topViaturas, distribuicao,
      };
    },
  });

  if (profileLoaded && !isMaster) return <Navigate to="/app" />;

  const COLORS = ["hsl(222 50% 35%)", "hsl(45 80% 55%)", "hsl(0 70% 55%)"];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-accent"/> Dashboard Executivo</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada da frota — últimos 6 meses.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi icon={Car} label="Frota ativa" value={data?.kpi.frota ?? "—"} tone="primary" />
        <Kpi icon={TrendingUp} label="Utilizações" value={data?.kpi.utilSemestre ?? "—"} tone="primary" />
        <Kpi icon={Fuel} label="Litros" value={data ? data.kpi.totalLitros.toFixed(0) : "—"} tone="accent" />
        <Kpi icon={AlertTriangle} label="Incidentes" value={data?.kpi.incSemestre ?? "—"} tone="destructive" />
        <Kpi icon={Wrench} label="Manut. vencidas" value={data?.kpi.manutVenc ?? "—"} tone="destructive" />
        <Kpi icon={FileWarning} label="Multas abertas" value={data?.kpi.multasAbertas ?? "—"} tone="destructive" />
        <Kpi icon={Users} label="CNH a vencer (30d)" value={data?.kpi.cnhVenc ?? "—"} tone="accent" />
        <Kpi
          icon={Fuel}
          label="Gasto combustível"
          value={data ? `R$ ${data.kpi.totalAbast.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—"}
          tone="primary"
        />
      </div>

      <Card className="p-4 shadow-card">
        <div className="font-semibold mb-3">Utilizações & Combustível por mês</div>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={data?.meses ?? []}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }}/>
              <YAxis tick={{ fontSize: 11 }}/>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }}/>
              <Bar dataKey="util" name="Utilizações" fill="hsl(222 50% 35%)" radius={[6,6,0,0]}/>
              <Bar dataKey="abast" name="Combustível R$" fill="hsl(45 80% 55%)" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4 shadow-card">
          <div className="font-semibold mb-3">Top viaturas (uso)</div>
          {(data?.topViaturas ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem dados.</div>
          ) : (
            <div className="space-y-2">
              {data!.topViaturas.map((t) => {
                const max = data!.topViaturas[0].usos || 1;
                return (
                  <div key={t.nome}>
                    <div className="flex justify-between text-sm">
                      <span className="truncate">{t.nome}</span>
                      <span className="font-semibold">{t.usos}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-primary" style={{ width: `${(t.usos / max) * 100}%` }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4 shadow-card">
          <div className="font-semibold mb-3">Distribuição de custos</div>
          {(data?.distribuicao ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem dados.</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data!.distribuicao} dataKey="value" nameKey="name" outerRadius={70} label>
                    {data!.distribuicao.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR")}`}/>
                  <Legend wrapperStyle={{ fontSize: 12 }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {isLoading && <div className="text-center text-sm text-muted-foreground">Carregando…</div>}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: any;
  tone: "primary" | "accent" | "destructive";
}) {
  const ring = tone === "primary" ? "bg-primary/10 text-primary border-primary/30"
    : tone === "accent" ? "bg-accent/15 text-accent border-accent/40"
    : "bg-destructive/10 text-destructive border-destructive/30";
  return (
    <Card className="p-3 shadow-card">
      <div className={`h-8 w-8 rounded-lg border flex items-center justify-center mb-2 ${ring}`}>
        <Icon className="h-4 w-4"/>
      </div>
      <div className="font-display font-bold text-xl leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}

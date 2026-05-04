import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, FileDown, FileSpreadsheet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportPDF, exportXLSX } from "@/lib/exporters";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/app/relatorios")({
  component: Relatorios,
});

const COLORS = ["#283c78", "#c89b3c", "#3b8a5e", "#b53a3a", "#6c5ce7"];

function Relatorios() {
  const { data } = useQuery({
    queryKey: ["relatorios"],
    queryFn: async () => {
      const [util, abast, viaturas] = await Promise.all([
        supabase.from("utilizacoes").select("*, viaturas(modelo, placa), condutores(nome)").order("data_saida", { ascending: false }).limit(500),
        supabase.from("abastecimentos").select("*, viaturas(modelo, placa), condutores(nome)").order("data_abastecimento", { ascending: false }).limit(500),
        supabase.from("viaturas").select("id, modelo, placa").eq("ativa", true),
      ]);
      return { util: util.data ?? [], abast: abast.data ?? [], viaturas: viaturas.data ?? [] };
    },
  });

  // Agrupamentos
  const porMes = (() => {
    const m = new Map<string, number>();
    for (const u of data?.util ?? []) {
      const k = new Date(u.data_saida).toISOString().slice(0, 7);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).slice(-6).map(([mes, qtd]) => ({ mes, qtd }));
  })();

  const porViatura = (() => {
    const m = new Map<string, number>();
    for (const u of data?.util ?? []) {
      const nome = (u as any).viaturas?.modelo ?? "—";
      m.set(nome, (m.get(nome) ?? 0) + 1);
    }
    return Array.from(m.entries()).slice(0, 6).map(([nome, qtd]) => ({ nome, qtd }));
  })();

  const custoPorViatura = (() => {
    const m = new Map<string, number>();
    for (const a of data?.abast ?? []) {
      const nome = (a as any).viaturas?.modelo ?? "—";
      m.set(nome, (m.get(nome) ?? 0) + Number(a.valor_total));
    }
    return Array.from(m.entries()).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  })();

  function exportUtilPDF() {
    exportPDF({
      title: "Histórico de Utilizações",
      subtitle: `Gerado em ${new Date().toLocaleString("pt-BR")}`,
      head: ["Viatura", "Placa", "Condutor", "Saída", "KM ini", "Retorno", "KM fim", "Local"],
      rows: (data?.util ?? []).map((u: any) => [
        u.viaturas?.modelo ?? "", u.viaturas?.placa ?? "", u.condutores?.nome ?? "",
        formatDateTime(u.data_saida), u.km_inicial ?? "",
        u.data_retorno ? formatDateTime(u.data_retorno) : "Em aberto", u.km_final ?? "",
        u.local_saida ?? "",
      ]),
      filename: `utilizacoes-${Date.now()}.pdf`,
    });
  }
  function exportUtilXLSX() {
    exportXLSX({
      sheetName: "Utilizações",
      head: ["Viatura", "Placa", "Condutor", "Saída", "KM inicial", "Retorno", "KM final", "Local"],
      rows: (data?.util ?? []).map((u: any) => [
        u.viaturas?.modelo ?? "", u.viaturas?.placa ?? "", u.condutores?.nome ?? "",
        formatDateTime(u.data_saida), u.km_inicial ?? "",
        u.data_retorno ? formatDateTime(u.data_retorno) : "Em aberto", u.km_final ?? "",
        u.local_saida ?? "",
      ]),
      filename: `utilizacoes-${Date.now()}.xlsx`,
    });
  }
  function exportAbastPDF() {
    exportPDF({
      title: "Abastecimentos",
      subtitle: `Gerado em ${new Date().toLocaleString("pt-BR")}`,
      head: ["Data", "Viatura", "Placa", "Condutor", "Litros", "Valor"],
      rows: (data?.abast ?? []).map((a: any) => [
        formatDateTime(a.data_abastecimento), a.viaturas?.modelo ?? "", a.viaturas?.placa ?? "",
        a.condutores?.nome ?? "", Number(a.litros).toFixed(2), `R$ ${Number(a.valor_total).toFixed(2)}`,
      ]),
      filename: `abastecimentos-${Date.now()}.pdf`,
    });
  }
  function exportAbastXLSX() {
    exportXLSX({
      sheetName: "Abastecimentos",
      head: ["Data", "Viatura", "Placa", "Condutor", "Litros", "Valor"],
      rows: (data?.abast ?? []).map((a: any) => [
        formatDateTime(a.data_abastecimento), a.viaturas?.modelo ?? "", a.viaturas?.placa ?? "",
        a.condutores?.nome ?? "", Number(a.litros).toFixed(2), Number(a.valor_total).toFixed(2),
      ]),
      filename: `abastecimentos-${Date.now()}.xlsx`,
    });
  }

  return (
    <div className="space-y-5">
      <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4"/> Voltar</Link>
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Indicadores e exportação para prestação de contas.</p>
      </div>

      <Card className="p-4 shadow-card">
        <div className="text-sm font-semibold mb-3">Saídas por mês</div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={porMes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" fontSize={11}/>
              <YAxis fontSize={11}/>
              <Tooltip />
              <Bar dataKey="qtd" fill="#283c78" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-4 shadow-card">
          <div className="text-sm font-semibold mb-3">Utilizações por viatura</div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={porViatura} layout="vertical">
                <XAxis type="number" fontSize={11}/>
                <YAxis type="category" dataKey="nome" fontSize={10} width={100}/>
                <Tooltip />
                <Bar dataKey="qtd" fill="#c89b3c" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 shadow-card">
          <div className="text-sm font-semibold mb-3">Custo de combustível por viatura</div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={custoPorViatura} dataKey="value" nameKey="name" outerRadius={80} label={(e) => `R$ ${e.value}`}>
                  {custoPorViatura.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
                <Tooltip formatter={(v: any) => `R$ ${v}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4 shadow-card space-y-3">
        <div className="text-sm font-semibold">Exportar dados</div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={exportUtilPDF}><FileDown className="h-4 w-4"/> Utilizações PDF</Button>
          <Button variant="outline" onClick={exportUtilXLSX}><FileSpreadsheet className="h-4 w-4"/> Utilizações Excel</Button>
          <Button variant="outline" onClick={exportAbastPDF}><FileDown className="h-4 w-4"/> Abastec. PDF</Button>
          <Button variant="outline" onClick={exportAbastXLSX}><FileSpreadsheet className="h-4 w-4"/> Abastec. Excel</Button>
        </div>
      </Card>
    </div>
  );
}

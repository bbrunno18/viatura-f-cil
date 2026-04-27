import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import * as XLSX from "xlsx";
import { Download, ChevronLeft, FileSpreadsheet, Car, Fuel, Users, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, formatCPF, formatDateTime, weekday } from "@/lib/format";

export const Route = createFileRoute("/app/admin")({
  component: AdminPanel,
});

function AdminPanel() {
  const { isAdmin, loading } = useAuth();

  const { data } = useQuery({
    queryKey: ["admin-all"],
    enabled: isAdmin,
    queryFn: async () => {
      const [u, a, c, v] = await Promise.all([
        supabase.from("utilizacoes").select("*, viaturas(modelo, cor, placa), condutores(nome, cpf)").order("data_saida", { ascending: false }),
        supabase.from("abastecimentos").select("*, viaturas(modelo, cor, placa), condutores(nome, cpf)").order("data_abastecimento", { ascending: false }),
        supabase.from("condutores").select("*").order("nome"),
        supabase.from("viaturas").select("*").order("modelo"),
      ]);
      return {
        utilizacoes: u.data ?? [],
        abastecimentos: a.data ?? [],
        condutores: c.data ?? [],
        viaturas: v.data ?? [],
      };
    },
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const totalLitros = data.abastecimentos.reduce((s, r: any) => s + Number(r.litros), 0);
    const totalGasto = data.abastecimentos.reduce((s, r: any) => s + Number(r.valor_total), 0);
    const emUso = data.utilizacoes.filter((u: any) => !u.data_retorno).length;
    return { totalLitros, totalGasto, emUso };
  }, [data]);

  if (loading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!isAdmin) return <Navigate to="/app"/>;

  function exportar() {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const utilSheet = data.utilizacoes.map((u: any) => ({
      Viatura: `${u.viaturas?.modelo} ${u.viaturas?.cor}`,
      Placa: u.viaturas?.placa ?? "",
      Condutor: u.condutores?.nome,
      CPF: formatCPF(u.condutores?.cpf ?? ""),
      "Data Saída": formatDateTime(u.data_saida),
      "KM Inicial": u.km_inicial,
      "Local Saída": u.local_saida,
      "Data Retorno": u.data_retorno ? formatDateTime(u.data_retorno) : "Em uso",
      "KM Final": u.km_final ?? "",
      "KM Rodados": u.km_final != null ? u.km_final - u.km_inicial : "",
      "Local Estacionamento": u.local_estacionamento ?? "",
      Latitude: u.latitude_estacionamento ?? "",
      Longitude: u.longitude_estacionamento ?? "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(utilSheet), "Utilizações");

    const abastSheet = data.abastecimentos.map((a: any) => ({
      Data: formatDateTime(a.data_abastecimento),
      "Dia da Semana": weekday(a.data_abastecimento),
      Viatura: `${a.viaturas?.modelo} ${a.viaturas?.cor}`,
      Placa: a.viaturas?.placa ?? "",
      Condutor: a.condutores?.nome,
      CPF: formatCPF(a.condutores?.cpf ?? ""),
      Litros: Number(a.litros),
      "Valor Total (R$)": Number(a.valor_total),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(abastSheet), "Abastecimentos");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      data.condutores.map((c) => ({ CPF: formatCPF(c.cpf), Nome: c.nome }))
    ), "Condutores");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      data.viaturas.map((v) => ({ Modelo: v.modelo, Cor: v.cor, Placa: v.placa ?? "", Ativa: v.ativa ? "Sim" : "Não" }))
    ), "Viaturas");

    XLSX.writeFile(wb, `frotacop-${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("Planilha exportada");
  }

  return (
    <div className="space-y-5">
      <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4"/> Voltar</Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Visão geral da frota.</p>
        </div>
        <Button onClick={exportar} className="bg-gradient-accent text-accent-foreground shrink-0" size="sm">
          <Download className="h-4 w-4 mr-1"/> Excel
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 shadow-card">
            <Activity className="h-5 w-5 text-primary mb-2"/>
            <div className="text-2xl font-bold font-display">{stats.emUso}</div>
            <div className="text-xs text-muted-foreground">Em uso agora</div>
          </Card>
          <Card className="p-4 shadow-card">
            <Car className="h-5 w-5 text-primary mb-2"/>
            <div className="text-2xl font-bold font-display">{data?.viaturas.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">Viaturas</div>
          </Card>
          <Card className="p-4 shadow-card">
            <Fuel className="h-5 w-5 text-accent mb-2"/>
            <div className="text-2xl font-bold font-display">{stats.totalLitros.toFixed(0)} L</div>
            <div className="text-xs text-muted-foreground">Total abastecido</div>
          </Card>
          <Card className="p-4 shadow-card">
            <FileSpreadsheet className="h-5 w-5 text-accent mb-2"/>
            <div className="text-2xl font-bold font-display">{formatBRL(stats.totalGasto)}</div>
            <div className="text-xs text-muted-foreground">Gasto em combustível</div>
          </Card>
        </div>
      )}

      <Tabs defaultValue="util">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="util">Utilizações</TabsTrigger>
          <TabsTrigger value="abast">Abastecimentos</TabsTrigger>
          <TabsTrigger value="cond"><Users className="h-3.5 w-3.5 mr-1"/>Cond.</TabsTrigger>
        </TabsList>

        <TabsContent value="util">
          <Card className="overflow-x-auto shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Viatura</TableHead>
                  <TableHead>Condutor</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Retorno</TableHead>
                  <TableHead className="text-right">KM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.utilizacoes.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-xs whitespace-nowrap">{u.viaturas?.modelo} <span className="text-muted-foreground">{u.viaturas?.cor}</span></TableCell>
                    <TableCell className="text-xs">{u.condutores?.nome}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatDateTime(u.data_saida)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{u.data_retorno ? formatDateTime(u.data_retorno) : <span className="text-warning-foreground font-semibold">Em uso</span>}</TableCell>
                    <TableCell className="text-xs text-right">{u.km_final != null ? `${(u.km_final - u.km_inicial).toLocaleString("pt-BR")}` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="abast">
          <Card className="overflow-x-auto shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Viatura</TableHead>
                  <TableHead>Condutor</TableHead>
                  <TableHead className="text-right">Litros</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.abastecimentos.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatDateTime(a.data_abastecimento)}</TableCell>
                    <TableCell className="text-xs">{a.viaturas?.modelo}</TableCell>
                    <TableCell className="text-xs">{a.condutores?.nome}</TableCell>
                    <TableCell className="text-xs text-right">{Number(a.litros).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{formatBRL(Number(a.valor_total))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="cond">
          <Card className="overflow-x-auto shadow-card">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Nome</TableHead><TableHead>CPF</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {data?.condutores.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{c.nome}</TableCell>
                    <TableCell className="text-sm">{formatCPF(c.cpf)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

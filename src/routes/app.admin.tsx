import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, ChevronLeft, FileSpreadsheet, Car, Fuel, Users, Activity, Printer, Check, X, UserCog, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatCPF, formatDateTime, weekday } from "@/lib/format";

export const Route = createFileRoute("/app/admin")({
  component: AdminPanel,
});

function AdminPanel() {
  const qc = useQueryClient();
  const { isAdmin, isMaster, loading } = useAuth();

  const { data } = useQuery({
    queryKey: ["admin-all"],
    enabled: isAdmin,
    queryFn: async () => {
      const [u, a, c, v, p] = await Promise.all([
        supabase.from("utilizacoes").select("*, viaturas(modelo, cor, placa), condutores(nome, cpf)").order("data_saida", { ascending: false }),
        supabase.from("abastecimentos").select("*, viaturas(modelo, cor, placa), condutores(nome, cpf)").order("data_abastecimento", { ascending: false }),
        supabase.from("condutores").select("*").order("nome"),
        supabase.from("viaturas").select("*").order("modelo"),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      ]);
      const roles = await supabase.from("user_roles").select("user_id, role");
      return {
        utilizacoes: u.data ?? [],
        abastecimentos: a.data ?? [],
        condutores: c.data ?? [],
        viaturas: v.data ?? [],
        profiles: p.data ?? [],
        roles: roles.data ?? [],
      };
    },
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const totalLitros = data.abastecimentos.reduce((s, r: any) => s + Number(r.litros), 0);
    const totalGasto = data.abastecimentos.reduce((s, r: any) => s + Number(r.valor_total), 0);
    const emUso = data.utilizacoes.filter((u: any) => !u.data_retorno).length;
    const pendentes = data.profiles.filter((p: any) => !p.aprovado).length;
    return { totalLitros, totalGasto, emUso, pendentes };
  }, [data]);

  if (loading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!isAdmin) return <Navigate to="/app" />;

  async function aprovar(id: string) {
    const { error } = await supabase.from("profiles").update({ aprovado: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Usuário aprovado");
    qc.invalidateQueries({ queryKey: ["admin-all"] });
  }
  async function rejeitar(id: string) {
    const { error } = await supabase.from("profiles").update({ aprovado: false }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Aprovação revogada");
    qc.invalidateQueries({ queryKey: ["admin-all"] });
  }
  async function promover(id: string, role: "admin" | "user") {
    if (!isMaster) return toast.error("Apenas o Master pode alterar papéis.");
    if (role === "admin") {
      const { error } = await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
      if (error && !error.message.includes("duplicate")) return toast.error(error.message);
      toast.success("Promovido a admin");
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin removido");
    }
    qc.invalidateQueries({ queryKey: ["admin-all"] });
  }

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
      data.condutores.map((c: any) => ({ CPF: formatCPF(c.cpf), Nome: c.nome }))
    ), "Condutores");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      data.viaturas.map((v: any) => ({ Modelo: v.modelo, Cor: v.cor, Placa: v.placa ?? "", Ativa: v.ativa ? "Sim" : "Não" }))
    ), "Viaturas");
    XLSX.writeFile(wb, `frota-colog-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Planilha exportada");
  }

  function imprimirPDF() {
    if (!data) return;
    const doc = new jsPDF({ orientation: "landscape" });
    const hoje = new Date().toLocaleDateString("pt-BR");
    doc.setFontSize(16);
    doc.text("Frota COLOG — Relatório Geral", 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em ${hoje}`, 14, 22);
    doc.text(`Viaturas: ${data.viaturas.length}  |  Em uso: ${stats?.emUso ?? 0}  |  Litros: ${stats?.totalLitros.toFixed(0) ?? 0}  |  Gasto: ${formatBRL(stats?.totalGasto ?? 0)}`, 14, 28);

    autoTable(doc, {
      startY: 34,
      head: [["Utilizações"]],
      body: [[""]],
      theme: "plain",
      styles: { fontStyle: "bold", fontSize: 12 },
    });
    autoTable(doc, {
      head: [["Viatura", "Condutor", "Saída", "KM ini.", "Retorno", "KM fim", "KM rod."]],
      body: data.utilizacoes.map((u: any) => [
        `${u.viaturas?.modelo ?? ""} ${u.viaturas?.cor ?? ""}`,
        u.condutores?.nome ?? "",
        formatDateTime(u.data_saida),
        u.km_inicial,
        u.data_retorno ? formatDateTime(u.data_retorno) : "Em uso",
        u.km_final ?? "",
        u.km_final != null ? u.km_final - u.km_inicial : "",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [40, 60, 120] },
    });

    doc.addPage();
    doc.setFontSize(14);
    doc.text("Abastecimentos", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [["Data", "Viatura", "Condutor", "Litros", "Valor (R$)"]],
      body: data.abastecimentos.map((a: any) => [
        formatDateTime(a.data_abastecimento),
        `${a.viaturas?.modelo ?? ""} ${a.viaturas?.cor ?? ""}`,
        a.condutores?.nome ?? "",
        Number(a.litros).toFixed(2),
        formatBRL(Number(a.valor_total)),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [40, 60, 120] },
    });

    doc.save(`frota-colog-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF gerado — imprima ou salve");
  }

  const roleByUser = new Map<string, string[]>();
  for (const r of data?.roles ?? []) {
    const arr = roleByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    roleByUser.set(r.user_id, arr);
  }

  return (
    <div className="space-y-5">
      <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" /> Voltar</Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Painel {isMaster ? "Master" : "Administrativo"}</h1>
          <p className="text-sm text-muted-foreground">Visão geral da frota.</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button onClick={imprimirPDF} className="bg-gradient-primary" size="sm">
            <Printer className="h-4 w-4 mr-1" /> Imprimir PDF
          </Button>
          <Button onClick={exportar} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 shadow-card">
            <Activity className="h-5 w-5 text-primary mb-2" />
            <div className="text-2xl font-bold font-display">{stats.emUso}</div>
            <div className="text-xs text-muted-foreground">Em uso agora</div>
          </Card>
          <Card className="p-4 shadow-card">
            <Car className="h-5 w-5 text-primary mb-2" />
            <div className="text-2xl font-bold font-display">{data?.viaturas.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">Viaturas</div>
          </Card>
          <Card className="p-4 shadow-card">
            <Fuel className="h-5 w-5 text-accent mb-2" />
            <div className="text-2xl font-bold font-display">{stats.totalLitros.toFixed(0)} L</div>
            <div className="text-xs text-muted-foreground">Total abastecido</div>
          </Card>
          <Card className="p-4 shadow-card">
            <FileSpreadsheet className="h-5 w-5 text-accent mb-2" />
            <div className="text-2xl font-bold font-display">{formatBRL(stats.totalGasto)}</div>
            <div className="text-xs text-muted-foreground">Gasto em combustível</div>
          </Card>
        </div>
      )}

      {stats && stats.pendentes > 0 && (
        <Card className="p-3 bg-warning/10 border-warning/40 text-sm">
          <b>{stats.pendentes}</b> usuário(s) aguardando aprovação. Veja a aba <b>Usuários</b>.
        </Card>
      )}

      <Tabs defaultValue="users">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="users"><UserCog className="h-3.5 w-3.5 mr-1" />Usuários</TabsTrigger>
          <TabsTrigger value="util">Usos</TabsTrigger>
          <TabsTrigger value="abast">Abast.</TabsTrigger>
          <TabsTrigger value="cond"><Users className="h-3.5 w-3.5 mr-1" />Cond.</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="overflow-x-auto shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Secretaria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.profiles.map((p: any) => {
                  const roles = roleByUser.get(p.id) ?? [];
                  const isM = roles.includes("master");
                  const isA = roles.includes("admin");
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium">{p.nome || "—"}</div>
                        <div className="text-muted-foreground">{p.email}</div>
                      </TableCell>
                      <TableCell className="text-xs">{p.secretaria ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {p.aprovado
                          ? <span className="text-success font-semibold">Aprovado</span>
                          : <span className="text-warning-foreground font-semibold">Pendente</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {isM ? "Master" : isA ? "Admin" : "Usuário"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end flex-wrap">
                          {!p.aprovado ? (
                            <Button size="sm" variant="outline" onClick={() => aprovar(p.id)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => rejeitar(p.id)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isMaster && !isM && (
                            isA ? (
                              <Button size="sm" variant="ghost" onClick={() => promover(p.id, "user")}>
                                Rem. admin
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => promover(p.id, "admin")}>
                                <UserCog className="h-3.5 w-3.5 mr-1" /> Tornar admin
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

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
                  <TableHead></TableHead>
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
                    <TableCell>
                      <EditUtilDialog row={u} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-all"] })} />
                    </TableCell>
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
                  <TableHead></TableHead>
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
                    <TableCell>
                      <EditAbastDialog row={a} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-all"] })} />
                    </TableCell>
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
                {data?.condutores.map((c: any) => (
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

function EditUtilDialog({ row, onSaved }: { row: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [kmIni, setKmIni] = useState(String(row.km_inicial ?? ""));
  const [kmFim, setKmFim] = useState(String(row.km_final ?? ""));
  const [busy, setBusy] = useState(false);

  async function salvar() {
    setBusy(true);
    const payload: any = { km_inicial: Number(kmIni) };
    if (kmFim) payload.km_final = Number(kmFim);
    const { error } = await supabase.from("utilizacoes").update(payload).eq("id", row.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar KM</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>KM Inicial</Label><Input type="number" value={kmIni} onChange={(e) => setKmIni(e.target.value)} /></div>
          <div><Label>KM Final</Label><Input type="number" value={kmFim} onChange={(e) => setKmFim(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={salvar} disabled={busy} className="bg-gradient-primary">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAbastDialog({ row, onSaved }: { row: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [litros, setLitros] = useState(String(row.litros));
  const [valor, setValor] = useState(String(row.valor_total));
  const [busy, setBusy] = useState(false);

  async function salvar() {
    setBusy(true);
    const { error } = await supabase.from("abastecimentos")
      .update({ litros: Number(litros), valor_total: Number(valor) }).eq("id", row.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar abastecimento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Litros</Label><Input type="number" step="0.01" value={litros} onChange={(e) => setLitros(e.target.value)} /></div>
          <div><Label>Valor total (R$)</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={salvar} disabled={busy} className="bg-gradient-primary">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

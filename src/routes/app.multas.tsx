import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileWarning, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/multas")({
  component: Multas,
});

function Multas() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    viatura_id: "", condutor_id: "", data_infracao: new Date().toISOString().slice(0, 10),
    descricao: "", local: "", valor: "", situacao: "aberta", observacao: "",
  });

  const { data: viaturas } = useQuery({
    queryKey: ["viaturas-all"],
    queryFn: async () => (await supabase.from("viaturas").select("id, modelo, placa").eq("ativa", true).order("modelo")).data ?? [],
  });
  const { data: condutores } = useQuery({
    queryKey: ["condutores-all"],
    queryFn: async () => (await supabase.from("condutores").select("id, nome").order("nome")).data ?? [],
  });
  const { data, isLoading } = useQuery({
    queryKey: ["multas"],
    queryFn: async () => (await supabase.from("multas").select("*").order("data_infracao", { ascending: false })).data ?? [],
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.viatura_id || !form.descricao) return toast.error("Selecione viatura e descreva a infração");
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("multas").insert({
      viatura_id: form.viatura_id,
      condutor_id: form.condutor_id || null,
      data_infracao: form.data_infracao,
      descricao: form.descricao,
      local: form.local || null,
      valor: Number(form.valor) || 0,
      situacao: form.situacao,
      observacao: form.observacao || null,
      registrado_por: user?.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Multa registrada");
    setOpen(false);
    setForm({ ...form, descricao: "", local: "", valor: "", observacao: "" });
    qc.invalidateQueries({ queryKey: ["multas"] });
  }

  function viaturaNome(id: string) {
    const v = viaturas?.find((x: any) => x.id === id);
    return v ? `${v.modelo} ${v.placa ?? ""}`.trim() : "—";
  }
  function condNome(id?: string | null) {
    if (!id) return "—";
    return condutores?.find((c: any) => c.id === id)?.nome ?? "—";
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileWarning className="h-6 w-6 text-destructive"/> Multas</h1>
          <p className="text-sm text-muted-foreground">Infrações registradas por viatura.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpen(!open)} className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-1"/> Nova
          </Button>
        )}
      </div>

      {open && isAdmin && (
        <Card className="p-5 shadow-card">
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Viatura *</Label>
                <Select value={form.viatura_id} onValueChange={(v) => setForm({ ...form, viatura_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
                  <SelectContent>
                    {viaturas?.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.modelo} {v.placa}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condutor</Label>
                <Select value={form.condutor_id} onValueChange={(v) => setForm({ ...form, condutor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
                  <SelectContent>
                    {condutores?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.data_infracao} onChange={(e) => setForm({ ...form, data_infracao: e.target.value })}/>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })}/>
              </div>
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Excesso de velocidade"/>
            </div>
            <div>
              <Label>Local</Label>
              <Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })}/>
            </div>
            <div>
              <Label>Situação</Label>
              <Select value={form.situacao} onValueChange={(v) => setForm({ ...form, situacao: v })}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                  <SelectItem value="recurso">Em recurso</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })}/>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-primary h-10">
              {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : "Registrar"}
            </Button>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">{[0,1].map(i => <Card key={i} className="h-20 bg-muted animate-pulse"/>)}</div>
      ) : data?.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">Nenhuma multa registrada.</Card>
      ) : (
        <div className="space-y-2">
          {data?.map((m: any) => (
            <Card key={m.id} className="p-3 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{m.descricao}</div>
                  <div className="text-xs text-muted-foreground">{viaturaNome(m.viatura_id)} • {condNome(m.condutor_id)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(m.data_infracao).toLocaleDateString("pt-BR")} {m.local ? `• ${m.local}` : ""}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-bold">R$ {Number(m.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  <Badge variant={m.situacao === "paga" ? "secondary" : m.situacao === "aberta" ? "destructive" : "outline"} className="mt-1 text-[10px]">
                    {m.situacao}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

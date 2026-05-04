import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, CalendarPlus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { logAction } from "@/lib/audit";

export const Route = createFileRoute("/app/reservas")({
  component: Reservas,
});

function Reservas() {
  const { user, aprovado, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vid, setVid] = useState("");
  const [cid, setCid] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [obs, setObs] = useState("");

  const { data } = useQuery({
    queryKey: ["reservas"],
    queryFn: async () => {
      const [r, v, c] = await Promise.all([
        supabase.from("reservas").select("*, viaturas(modelo, placa), condutores(nome)").order("inicio", { ascending: true }),
        supabase.from("viaturas").select("*").eq("ativa", true).order("modelo"),
        supabase.from("condutores").select("*").order("nome"),
      ]);
      return { reservas: r.data ?? [], viaturas: v.data ?? [], condutores: c.data ?? [] };
    },
  });

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!aprovado) return toast.error("Conta pendente de aprovação");
    if (!vid || !cid || !inicio || !fim) return toast.error("Preencha todos os campos");
    if (new Date(fim) <= new Date(inicio)) return toast.error("Data fim deve ser após início");
    setBusy(true);
    const payload = {
      viatura_id: vid, condutor_id: cid,
      inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(),
      observacao: obs || null, registrado_por: user!.id, status: "agendada",
    };
    const { data: ins, error } = await supabase.from("reservas").insert(payload).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    await logAction("reserva.criar", { tabela: "reservas", registro_id: ins.id, detalhes: payload });
    toast.success("Reserva agendada");
    setOpen(false); setVid(""); setCid(""); setInicio(""); setFim(""); setObs("");
    qc.invalidateQueries({ queryKey: ["reservas"] });
  }

  async function cancelar(id: string) {
    if (!confirm("Cancelar esta reserva?")) return;
    const { error } = await supabase.from("reservas").update({ status: "cancelada" }).eq("id", id);
    if (error) return toast.error(error.message);
    await logAction("reserva.cancelar", { tabela: "reservas", registro_id: id });
    toast.success("Reserva cancelada");
    qc.invalidateQueries({ queryKey: ["reservas"] });
  }

  return (
    <div className="space-y-5">
      <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4"/> Voltar</Link>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reservas de Viatura</h1>
          <p className="text-sm text-muted-foreground">Agende uma viatura para uso futuro.</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)} className="bg-gradient-primary"><CalendarPlus className="h-4 w-4"/> Nova</Button>
      </div>

      {open && (
        <Card className="p-5 shadow-card">
          <form onSubmit={criar} className="space-y-3">
            <div>
              <Label>Viatura</Label>
              <Select value={vid} onValueChange={setVid}>
                <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
                <SelectContent>{data?.viaturas.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.modelo}{v.placa ? ` (${v.placa})` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condutor</Label>
              <Select value={cid} onValueChange={setCid}>
                <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
                <SelectContent>{data?.condutores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início</Label><Input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
              <div><Label>Fim previsto</Label><Input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
            </div>
            <div><Label>Observação</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Missão, destino, etc." rows={2}/></div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : "Agendar"}</Button>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {data?.reservas.length === 0 && <Card className="p-4 text-center text-sm text-muted-foreground">Nenhuma reserva.</Card>}
        {data?.reservas.map((r: any) => (
          <Card key={r.id} className="p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.viaturas?.modelo}{r.viaturas?.placa ? ` · ${r.viaturas.placa}` : ""}</div>
                <div className="text-xs text-muted-foreground">Condutor: {r.condutores?.nome}</div>
                <div className="text-xs mt-1">{formatDateTime(r.inicio)} → {formatDateTime(r.fim)}</div>
                {r.observacao && <div className="text-xs text-muted-foreground mt-1">{r.observacao}</div>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-[10px] uppercase font-bold tracking-wider rounded-full px-2 py-0.5 border ${r.status === "agendada" ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground"}`}>{r.status}</span>
                {(isAdmin || r.registrado_por === user?.id) && r.status === "agendada" && (
                  <Button size="sm" variant="ghost" onClick={() => cancelar(r.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

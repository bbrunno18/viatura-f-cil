import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Wrench, Plus, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logAction } from "@/lib/audit";

export const Route = createFileRoute("/app/manutencao")({
  component: Manutencao,
});

const TIPOS = ["Troca de óleo", "Revisão geral", "Pneus", "Freios", "Licenciamento", "IPVA", "Seguro", "Reparo", "Outro"];

function Manutencao() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vid, setVid] = useState(""); const [tipo, setTipo] = useState("");
  const [descricao, setDescricao] = useState(""); const [data, setData] = useState("");
  const [proxima, setProxima] = useState(""); const [custo, setCusto] = useState(""); const [km, setKm] = useState("");

  const { data: lists } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: async () => {
      const [m, v] = await Promise.all([
        supabase.from("manutencoes").select("*, viaturas(modelo, placa)").order("data_servico", { ascending: false }),
        supabase.from("viaturas").select("*").eq("ativa", true).order("modelo"),
      ]);
      return { manutencoes: m.data ?? [], viaturas: v.data ?? [] };
    },
  });

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const vencidas = (lists?.manutencoes ?? []).filter((m: any) => m.proxima_data && new Date(m.proxima_data) <= hoje);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return toast.error("Apenas administradores");
    if (!vid || !tipo || !data) return toast.error("Preencha viatura, tipo e data");
    setBusy(true);
    const payload: any = {
      viatura_id: vid, tipo, descricao: descricao || null,
      data_servico: data, proxima_data: proxima || null,
      custo: custo ? Number(custo) : null, km_servico: km ? parseInt(km) : null,
      registrado_por: user!.id,
    };
    const { data: ins, error } = await supabase.from("manutencoes").insert(payload).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    await logAction("manutencao.criar", { tabela: "manutencoes", registro_id: ins.id, detalhes: payload });
    toast.success("Manutenção registrada");
    setOpen(false);
    setVid(""); setTipo(""); setDescricao(""); setData(""); setProxima(""); setCusto(""); setKm("");
    qc.invalidateQueries({ queryKey: ["manutencoes"] });
  }

  return (
    <div className="space-y-5">
      <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4"/> Voltar</Link>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manutenção</h1>
          <p className="text-sm text-muted-foreground">Histórico e próximos vencimentos.</p>
        </div>
        {isAdmin && <Button onClick={() => setOpen((v) => !v)} className="bg-gradient-primary"><Plus className="h-4 w-4"/> Nova</Button>}
      </div>

      {vencidas.length > 0 && (
        <Card className="p-4 bg-destructive/10 border-destructive/40 flex gap-3 items-start">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5"/>
          <div className="text-sm">
            <div className="font-semibold">{vencidas.length} manutenção(ões) vencida(s)</div>
            <div className="text-muted-foreground">Verifique abaixo e providencie o serviço.</div>
          </div>
        </Card>
      )}

      {open && isAdmin && (
        <Card className="p-5 shadow-card">
          <form onSubmit={criar} className="space-y-3">
            <div>
              <Label>Viatura</Label>
              <Select value={vid} onValueChange={setVid}>
                <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
                <SelectContent>{lists?.viaturas.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.modelo}{v.placa ? ` (${v.placa})` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data do serviço</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
              <div><Label>Próximo vencimento</Label><Input type="date" value={proxima} onChange={(e) => setProxima(e.target.value)} /></div>
              <div><Label>KM no serviço</Label><Input type="number" value={km} onChange={(e) => setKm(e.target.value)} /></div>
              <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} /></div>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : "Salvar"}</Button>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {lists?.manutencoes.length === 0 && <Card className="p-4 text-center text-sm text-muted-foreground">Nenhum registro.</Card>}
        {lists?.manutencoes.map((m: any) => {
          const vencida = m.proxima_data && new Date(m.proxima_data) <= hoje;
          return (
            <Card key={m.id} className={`p-4 shadow-card ${vencida ? "border-destructive/40" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center"><Wrench className="h-5 w-5 text-primary"/></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{m.tipo}</span>
                    {vencida && <span className="text-[10px] uppercase font-bold text-destructive border border-destructive/40 rounded-full px-2 py-0.5">Vencida</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.viaturas?.modelo}{m.viaturas?.placa ? ` · ${m.viaturas.placa}` : ""}</div>
                  <div className="text-xs mt-1">Realizada: {new Date(m.data_servico).toLocaleDateString("pt-BR")}{m.proxima_data ? ` · Próxima: ${new Date(m.proxima_data).toLocaleDateString("pt-BR")}` : ""}</div>
                  {m.descricao && <div className="text-xs text-muted-foreground mt-1">{m.descricao}</div>}
                  {m.custo && <div className="text-xs font-medium mt-1">R$ {Number(m.custo).toFixed(2)}</div>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

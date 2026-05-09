import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/documentos")({
  component: Documentos,
});

function Documentos() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    viatura_id: "", tipo: "CRLV", numero: "", validade: "", observacao: "",
  });
  const [arquivo, setArquivo] = useState<File | null>(null);

  const { data: viaturas } = useQuery({
    queryKey: ["viaturas-all"],
    queryFn: async () => (await supabase.from("viaturas").select("id, modelo, placa").order("modelo")).data ?? [],
  });
  const { data, isLoading } = useQuery({
    queryKey: ["documentos"],
    queryFn: async () => (await supabase.from("documentos_viatura").select("*").order("validade", { ascending: true, nullsFirst: false })).data ?? [],
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.viatura_id || !form.tipo) return toast.error("Selecione viatura e tipo");
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    let arquivo_url: string | null = null;
    if (arquivo) {
      const path = `${form.viatura_id}/${Date.now()}-${arquivo.name}`;
      const { error: upErr } = await supabase.storage.from("documentos").upload(path, arquivo);
      if (upErr) { setBusy(false); return toast.error(upErr.message); }
      arquivo_url = path;
    }
    const { error } = await supabase.from("documentos_viatura").insert({
      viatura_id: form.viatura_id,
      tipo: form.tipo,
      numero: form.numero || null,
      validade: form.validade || null,
      arquivo_url,
      observacao: form.observacao || null,
      registrado_por: user?.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Documento cadastrado");
    setOpen(false);
    setForm({ viatura_id: "", tipo: "CRLV", numero: "", validade: "", observacao: "" });
    setArquivo(null);
    qc.invalidateQueries({ queryKey: ["documentos"] });
  }

  async function abrirArquivo(path: string) {
    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Erro ao abrir arquivo");
    window.open(data.signedUrl, "_blank");
  }

  function viaturaNome(id: string) {
    const v = viaturas?.find((x: any) => x.id === id);
    return v ? `${v.modelo} ${v.placa ?? ""}`.trim() : "—";
  }

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const em30 = new Date(hoje); em30.setDate(em30.getDate() + 30);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary"/> Documentos</h1>
          <p className="text-sm text-muted-foreground">CRLV, seguro e demais documentos das viaturas.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpen(!open)} className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-1"/> Novo
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
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRLV">CRLV</SelectItem>
                    <SelectItem value="Seguro">Seguro</SelectItem>
                    <SelectItem value="IPVA">IPVA</SelectItem>
                    <SelectItem value="Licenciamento">Licenciamento</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número</Label>
                <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })}/>
              </div>
              <div>
                <Label>Validade</Label>
                <Input type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })}/>
              </div>
            </div>
            <div>
              <Label>Arquivo (PDF/foto)</Label>
              <Input type="file" accept="application/pdf,image/*" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}/>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-primary h-10">
              {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : "Cadastrar"}
            </Button>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">{[0,1].map(i => <Card key={i} className="h-20 bg-muted animate-pulse"/>)}</div>
      ) : data?.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum documento cadastrado.</Card>
      ) : (
        <div className="space-y-2">
          {data?.map((d: any) => {
            const venc = d.validade ? new Date(d.validade) : null;
            const vencido = venc && venc < hoje;
            const vencendo = venc && !vencido && venc <= em30;
            return (
              <Card key={d.id} className="p-3 shadow-card flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${vencido ? "bg-destructive/10 text-destructive" : vencendo ? "bg-warning/10 text-warning-foreground" : "bg-primary/10 text-primary"}`}>
                  {vencido || vencendo ? <AlertTriangle className="h-5 w-5"/> : <FileText className="h-5 w-5"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{d.tipo} — {viaturaNome(d.viatura_id)}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.numero ? `Nº ${d.numero}` : ""}
                    {venc ? ` • Vence ${venc.toLocaleDateString("pt-BR")}` : ""}
                  </div>
                  {(vencido || vencendo) && (
                    <Badge variant={vencido ? "destructive" : "secondary"} className="mt-1 text-[10px]">
                      {vencido ? "VENCIDO" : "Vence em 30 dias"}
                    </Badge>
                  )}
                </div>
                {d.arquivo_url && (
                  <Button size="icon" variant="ghost" onClick={() => abrirArquivo(d.arquivo_url)} aria-label="Abrir arquivo">
                    <ExternalLink className="h-4 w-4"/>
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

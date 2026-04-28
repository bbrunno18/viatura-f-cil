import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Plus, Camera, AlertTriangle, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/app/incidentes")({
  component: IncidentesPage,
});

function IncidentesPage() {
  const qc = useQueryClient();
  const { aprovado, isAdmin } = useAuth();

  const { data: lista, isLoading } = useQuery({
    queryKey: ["incidentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidentes")
        .select("*, viaturas(modelo, cor, placa), condutores(nome)")
        .order("data_ocorrencia", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function remover(id: string, fotos: string[]) {
    if (!confirm("Excluir este incidente? Esta ação não pode ser desfeita.")) return;
    if (fotos.length) {
      await supabase.storage.from("incidentes").remove(fotos);
    }
    const { error } = await supabase.from("incidentes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Incidente removido");
    qc.invalidateQueries({ queryKey: ["incidentes"] });
  }

  return (
    <div className="space-y-5">
      <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4"/> Voltar</Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-warning-foreground"/> Incidentes
          </h1>
          <p className="text-sm text-muted-foreground">Batidas, danos e ocorrências com a frota.</p>
        </div>
        {aprovado && <NovoIncidenteDialog onCreated={() => qc.invalidateQueries({ queryKey: ["incidentes"] })} />}
      </div>

      {!aprovado && (
        <Card className="p-3 bg-warning/10 border-warning/40 text-sm">
          Sua conta ainda não foi aprovada. Você pode visualizar os incidentes mas não pode registrar novos.
        </Card>
      )}

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto"/>
      ) : lista && lista.length > 0 ? (
        <div className="space-y-3">
          {lista.map((i: any) => (
            <IncidenteCard key={i.id} inc={i} canDelete={isAdmin} onDelete={() => remover(i.id, i.fotos)} />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-muted-foreground text-sm">Nenhum incidente registrado.</Card>
      )}
    </div>
  );
}

function IncidenteCard({ inc, canDelete, onDelete }: { inc: any; canDelete: boolean; onDelete: () => void }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!inc.fotos?.length) return;
      const { data } = await supabase.storage.from("incidentes").createSignedUrls(inc.fotos, 3600);
      if (!cancelled && data) setUrls(data.map((d) => d.signedUrl).filter(Boolean) as string[]);
    }
    load();
    return () => { cancelled = true; };
  }, [inc.fotos]);

  return (
    <Card className="p-4 shadow-card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold">{inc.viaturas?.modelo} <span className="text-muted-foreground font-normal">{inc.viaturas?.cor}</span></div>
          <div className="text-xs text-muted-foreground">{formatDateTime(inc.data_ocorrencia)}{inc.condutores?.nome ? ` · ${inc.condutores.nome}` : ""}</div>
        </div>
        {canDelete && (
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Excluir">
            <Trash2 className="h-4 w-4 text-destructive"/>
          </Button>
        )}
      </div>
      <p className="text-sm whitespace-pre-wrap">{inc.descricao}</p>
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((u, i) => (
            <button key={i} type="button" onClick={() => setPreviewUrl(u)} className="aspect-square rounded-md overflow-hidden bg-muted">
              <img src={u} alt={`Foto ${i+1}`} className="w-full h-full object-cover"/>
            </button>
          ))}
        </div>
      )}
      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Foto do incidente</DialogTitle></DialogHeader>
          {previewUrl && <img src={previewUrl} alt="Foto" className="w-full rounded-md"/>}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function NovoIncidenteDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viaturaId, setViaturaId] = useState("");
  const [condutorId, setCondutorId] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 16));
  const [files, setFiles] = useState<File[]>([]);

  const { data: viaturas } = useQuery({
    queryKey: ["viaturas-ativas"],
    queryFn: async () => (await supabase.from("viaturas").select("id, modelo, cor").eq("ativa", true).order("modelo")).data ?? [],
    enabled: open,
  });
  const { data: condutores } = useQuery({
    queryKey: ["condutores-list"],
    queryFn: async () => (await supabase.from("condutores").select("id, nome").order("nome")).data ?? [],
    enabled: open,
  });

  function reset() {
    setViaturaId(""); setCondutorId(""); setDescricao(""); setFiles([]);
    setData(new Date().toISOString().slice(0, 16));
  }

  async function submit() {
    if (!user) return;
    if (!viaturaId) return toast.error("Selecione a viatura");
    if (!descricao.trim()) return toast.error("Descreva o ocorrido");
    if (descricao.length > 2000) return toast.error("Descrição muito longa (máx. 2000)");
    if (files.length > 6) return toast.error("Máximo de 6 fotos");
    setBusy(true);
    try {
      const fotos: string[] = [];
      for (const f of files) {
        if (f.size > 8 * 1024 * 1024) throw new Error(`Foto "${f.name}" maior que 8MB`);
        const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("incidentes").upload(path, f, {
          contentType: f.type, upsert: false,
        });
        if (upErr) throw upErr;
        fotos.push(path);
      }
      const { error } = await supabase.from("incidentes").insert({
        viatura_id: viaturaId,
        condutor_id: condutorId || null,
        descricao: descricao.trim(),
        data_ocorrencia: new Date(data).toISOString(),
        fotos,
        registrado_por: user.id,
      });
      if (error) throw error;
      toast.success("Incidente registrado");
      reset();
      setOpen(false);
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao registrar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-accent text-accent-foreground" size="sm">
          <Plus className="h-4 w-4 mr-1"/> Novo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registrar incidente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Viatura</Label>
            <Select value={viaturaId} onValueChange={setViaturaId}>
              <SelectTrigger><SelectValue placeholder="Escolha a viatura"/></SelectTrigger>
              <SelectContent>
                {viaturas?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.modelo} — {v.cor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Condutor (opcional)</Label>
            <Select value={condutorId} onValueChange={setCondutorId}>
              <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
              <SelectContent>
                {condutores?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data/hora</Label>
            <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <Label>Descrição do ocorrido</Label>
            <Textarea
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Pequena batida no para-choque traseiro ao estacionar..."
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Camera className="h-4 w-4 text-primary"/> Fotos (até 6)</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))}
            />
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(f)} alt={f.name} className="h-16 w-16 object-cover rounded"/>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3"/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy} className="bg-gradient-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

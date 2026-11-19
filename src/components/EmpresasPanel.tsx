import { useRef, useState } from "react";
import { Building2, Copy, ImagePlus, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizacoes } from "@/hooks/useOrganizacoes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** Painel do Master: cadastra empresas clientes e mostra o código de cadastro de cada uma. */
export function EmpresasPanel() {
  const qc = useQueryClient();
  const { data: empresas = [], isLoading } = useOrganizacoes();
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (nome.trim().length < 2) return toast.error("Informe o nome da empresa.");
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("admin_criar_organizacao", { _nome: nome.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Empresa cadastrada");
    setNome("");
    qc.invalidateQueries({ queryKey: ["organizacoes"] });
  }

  const fileRef = useRef<HTMLInputElement>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);

  async function enviarLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const orgId = alvo;
    e.target.value = "";
    if (!file || !orgId) return;
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) return toast.error("Use PNG, JPG, WEBP ou SVG.");
    if (file.size > 2 * 1024 * 1024) return toast.error("A imagem deve ter até 2 MB.");
    setEnviando(orgId);
    const ext = file.type.includes("svg") ? "svg" : file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
    const path = `${orgId}/logo-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("logos-empresas").upload(path, file, { contentType: file.type, upsert: true });
    if (up.error) { setEnviando(null); return toast.error(up.error.message); }
    const url = supabase.storage.from("logos-empresas").getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from("organizacoes").update({ logo_url: url }).eq("id", orgId);
    setEnviando(null);
    if (error) return toast.error(error.message);
    toast.success("Logo da empresa atualizada");
    qc.invalidateQueries({ queryKey: ["organizacoes"] });
  }

  async function removerLogo(orgId: string) {
    const { error } = await supabase.from("organizacoes").update({ logo_url: null }).eq("id", orgId);
    if (error) return toast.error(error.message);
    toast.success("Logo removida");
    qc.invalidateQueries({ queryKey: ["organizacoes"] });
  }

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      toast.success("Código copiado");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <Card className="p-4 shadow-card space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Building2 className="h-4 w-4 text-accent" /> Empresas clientes
      </div>
      <form onSubmit={criar} className="flex gap-2">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da nova empresa" />
        <Button type="submit" disabled={busy} className="bg-gradient-primary shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Criar</>}
        </Button>
      </form>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={enviarLogo} />
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : empresas.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma empresa ainda. Crie a primeira acima e depois adicione o administrador dela em Usuários.</p>
      ) : (
        <ul className="divide-y divide-border">
          {empresas.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-10 w-10 shrink-0 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden">
                  {o.logo_url ? <img src={o.logo_url} alt="" className="h-full w-full object-contain p-0.5" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{o.nome}</div>
                  <div className="flex gap-2 text-[11px]">
                    <button type="button" className="inline-flex items-center gap-1 text-primary font-semibold" disabled={enviando === o.id}
                      onClick={() => { setAlvo(o.id); fileRef.current?.click(); }}>
                      {enviando === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />} {o.logo_url ? "Trocar logo" : "Enviar logo"}
                    </button>
                    {o.logo_url && <button type="button" className="text-muted-foreground underline" onClick={() => removerLogo(o.id)}>Remover</button>}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copiar(o.codigo)}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 font-mono text-xs"
                title="Copiar código de cadastro"
              >
                {o.codigo} <Copy className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground">
        A logo aparece no topo do app para todos os usuários da empresa (PNG, JPG, WEBP ou SVG, até 2 MB; de preferência fundo transparente). O código permite que funcionários se cadastrem na tela de login já ligados à empresa (ficam pendentes até um administrador aprovar).
      </p>
    </Card>
  );
}

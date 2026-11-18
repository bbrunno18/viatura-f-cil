import { useState } from "react";
import { Building2, Copy, Loader2, Plus } from "lucide-react";
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
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : empresas.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma empresa ainda. Crie a primeira acima e depois adicione o administrador dela em Usuários.</p>
      ) : (
        <ul className="divide-y divide-border">
          {empresas.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2">
              <span className="truncate text-sm font-medium">{o.nome}</span>
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
        O código permite que funcionários se cadastrem na tela de login já ligados à empresa (ficam pendentes até um administrador aprovar).
      </p>
    </Card>
  );
}

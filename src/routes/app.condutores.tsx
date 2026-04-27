import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, UserPlus, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { formatCPF, onlyDigits } from "@/lib/format";

export const Route = createFileRoute("/app/condutores")({
  component: Condutores,
});

const schema = z.object({
  cpf: z.string().refine((v) => onlyDigits(v).length === 11, "CPF deve ter 11 dígitos"),
  nome: z.string().trim().min(2, "Informe o nome").max(100),
});

function Condutores() {
  const qc = useQueryClient();
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["condutores"],
    queryFn: async () => {
      const { data } = await supabase.from("condutores").select("*").order("nome");
      return data ?? [];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ cpf, nome });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.from("condutores").insert({
      cpf: onlyDigits(parsed.data.cpf),
      nome: parsed.data.nome,
    });
    setBusy(false);
    if (error) return toast.error(error.code === "23505" ? "CPF já cadastrado" : error.message);
    toast.success("Condutor cadastrado");
    setCpf(""); setNome("");
    qc.invalidateQueries({ queryKey: ["condutores"] });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Condutores</h1>

      <Card className="p-5 shadow-card">
        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserPlus className="h-4 w-4 text-primary"/> Cadastrar novo
          </div>
          <div>
            <Label>CPF</Label>
            <Input value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric"/>
          </div>
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-gradient-primary h-10">
            {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : "Cadastrar"}
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="font-display font-semibold text-lg mb-3">Cadastrados ({data?.length ?? 0})</h2>
        {isLoading ? (
          <div className="space-y-2">{[0,1].map(i => <Card key={i} className="h-14 bg-muted animate-pulse"/>)}</div>
        ) : data?.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum condutor cadastrado.</Card>
        ) : (
          <div className="space-y-2">
            {data?.map((c) => (
              <Card key={c.id} className="p-3 flex items-center gap-3 shadow-card">
                <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary"/>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{c.nome}</div>
                  <div className="text-xs text-muted-foreground">{formatCPF(c.cpf)}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

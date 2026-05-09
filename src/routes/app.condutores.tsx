import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, UserPlus, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [form, setForm] = useState({
    cpf: "", nome: "", telefone: "",
    cnh_numero: "", cnh_categoria: "B", cnh_validade: "",
  });
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
    const parsed = schema.safeParse({ cpf: form.cpf, nome: form.nome });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.from("condutores").insert({
      cpf: onlyDigits(parsed.data.cpf),
      nome: parsed.data.nome,
      telefone: form.telefone || null,
      cnh_numero: form.cnh_numero || null,
      cnh_categoria: form.cnh_categoria || null,
      cnh_validade: form.cnh_validade || null,
    });
    setBusy(false);
    if (error) return toast.error(error.code === "23505" ? "CPF já cadastrado" : error.message);
    toast.success("Condutor cadastrado");
    setForm({ cpf: "", nome: "", telefone: "", cnh_numero: "", cnh_categoria: "B", cnh_validade: "" });
    qc.invalidateQueries({ queryKey: ["condutores"] });
  }

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const em30 = new Date(hoje); em30.setDate(em30.getDate() + 30);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Condutores</h1>

      <Card className="p-5 shadow-card">
        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserPlus className="h-4 w-4 text-primary"/> Cadastrar novo
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" inputMode="numeric"/>
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000"/>
            </div>
          </div>
          <div>
            <Label>Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>CNH</Label>
              <Input value={form.cnh_numero} onChange={(e) => setForm({ ...form, cnh_numero: e.target.value })}/>
            </div>
            <div>
              <Label>Cat.</Label>
              <Select value={form.cnh_categoria} onValueChange={(v) => setForm({ ...form, cnh_categoria: v })}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {["A","B","AB","C","D","E"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Validade da CNH</Label>
            <Input type="date" value={form.cnh_validade} onChange={(e) => setForm({ ...form, cnh_validade: e.target.value })}/>
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
            {data?.map((c: any) => {
              const val = c.cnh_validade ? new Date(c.cnh_validade) : null;
              const vencida = val && val < hoje;
              const vencendo = val && !vencida && val <= em30;
              return (
                <Card key={c.id} className="p-3 flex items-center gap-3 shadow-card">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center ${vencida || vencendo ? "bg-destructive/10" : "bg-secondary"}`}>
                    {vencida || vencendo ? <AlertTriangle className="h-4 w-4 text-destructive"/> : <User className="h-4 w-4 text-primary"/>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCPF(c.cpf)}
                      {c.cnh_numero ? ` • CNH ${c.cnh_numero}` : ""}
                      {c.cnh_categoria ? ` (${c.cnh_categoria})` : ""}
                    </div>
                    {val && (
                      <div className="text-[11px] text-muted-foreground">
                        Validade: {val.toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                  {vencida && <Badge variant="destructive" className="text-[10px]">VENCIDA</Badge>}
                  {vencendo && <Badge variant="secondary" className="text-[10px]">Vence em 30d</Badge>}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

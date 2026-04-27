import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/app/abastecimentos/novo")({
  component: NovoAbastecimento,
});

function NovoAbastecimento() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [vid, setVid] = useState("");
  const [cid, setCid] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 16));
  const [litros, setLitros] = useState("");
  const [valor, setValor] = useState("");

  const { data: lists } = useQuery({
    queryKey: ["abast-lists"],
    queryFn: async () => {
      const [v, c] = await Promise.all([
        supabase.from("viaturas").select("*").eq("ativa", true).order("modelo"),
        supabase.from("condutores").select("*").order("nome"),
      ]);
      return { viaturas: v.data ?? [], condutores: c.data ?? [] };
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!vid || !cid || !litros || !valor || !data) return toast.error("Preencha todos os campos");
    setBusy(true);
    const { error } = await supabase.from("abastecimentos").insert({
      viatura_id: vid,
      condutor_id: cid,
      data_abastecimento: new Date(data).toISOString(),
      litros: parseFloat(litros.replace(",", ".")),
      valor_total: parseFloat(valor.replace(",", ".")),
      registrado_por: user!.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Abastecimento registrado");
    navigate({ to: "/app/abastecimentos" });
  }

  return (
    <div className="space-y-5">
      <Link to="/app/abastecimentos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4"/> Voltar
      </Link>
      <h1 className="text-2xl font-bold">Novo Abastecimento</h1>

      <Card className="p-5 shadow-card">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Viatura</Label>
            <Select value={vid} onValueChange={setVid}>
              <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
              <SelectContent>
                {lists?.viaturas.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>{v.modelo} — {v.cor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Condutor</Label>
            <Select value={cid} onValueChange={setCid}>
              <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
              <SelectContent>
                {lists?.condutores.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data e hora</Label>
            <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Litros</Label>
              <Input inputMode="decimal" value={litros} onChange={(e) => setLitros(e.target.value)} placeholder="0,00"/>
            </div>
            <div>
              <Label>Valor total (R$)</Label>
              <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00"/>
            </div>
          </div>
          <Button type="submit" className="w-full h-11 bg-gradient-primary" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : "Registrar abastecimento"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

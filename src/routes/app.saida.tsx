import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const searchSchema = z.object({
  viaturaId: z.string().optional(),
});

export const Route = createFileRoute("/app/saida")({
  validateSearch: (s) => searchSchema.parse(s),
  component: NovaSaida,
});

function NovaSaida() {
  const { viaturaId } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [vid, setVid] = useState(viaturaId ?? "");
  const [cid, setCid] = useState("");
  const [km, setKm] = useState("");
  const [local, setLocal] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 16));

  const { data: lists } = useQuery({
    queryKey: ["saida-lists"],
    queryFn: async () => {
      const [v, c, abertas] = await Promise.all([
        supabase.from("viaturas").select("*").eq("ativa", true).order("modelo"),
        supabase.from("condutores").select("*").order("nome"),
        supabase.from("utilizacoes").select("viatura_id").is("data_retorno", null),
      ]);
      const ocupadas = new Set((abertas.data ?? []).map((a) => a.viatura_id));
      return { viaturas: v.data ?? [], condutores: c.data ?? [], ocupadas };
    },
  });

  useEffect(() => {
    if (viaturaId) setVid(viaturaId);
  }, [viaturaId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!vid || !cid || !km || !local || !data) return toast.error("Preencha todos os campos");
    if (lists?.ocupadas.has(vid)) return toast.error("Esta viatura já está em uso");
    setBusy(true);
    const { error } = await supabase.from("utilizacoes").insert({
      viatura_id: vid,
      condutor_id: cid,
      data_saida: new Date(data).toISOString(),
      km_inicial: parseInt(km, 10),
      local_saida: local,
      registrado_por: user!.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saída registrada");
    navigate({ to: "/app" });
  }

  return (
    <div className="space-y-5">
      <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4"/> Voltar
      </Link>
      <h1 className="text-2xl font-bold">Saída da Viatura</h1>

      <Card className="p-5 shadow-card">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Viatura</Label>
            <Select value={vid} onValueChange={setVid}>
              <SelectTrigger><SelectValue placeholder="Selecione a viatura"/></SelectTrigger>
              <SelectContent>
                {lists?.viaturas.map((v: any) => (
                  <SelectItem key={v.id} value={v.id} disabled={lists.ocupadas.has(v.id)}>
                    {v.modelo} — {v.cor}{v.placa ? ` (${v.placa})` : ""}{lists.ocupadas.has(v.id) ? " · em uso" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Condutor</Label>
            <Select value={cid} onValueChange={setCid}>
              <SelectTrigger><SelectValue placeholder="Selecione o condutor"/></SelectTrigger>
              <SelectContent>
                {lists?.condutores.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome} — {c.cpf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link to="/app/condutores" className="text-xs text-primary mt-1 inline-block">+ Cadastrar novo condutor</Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <Label>KM inicial</Label>
              <Input type="number" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div>
            <Label>Local de saída</Label>
            <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Sede" />
          </div>

          <Button type="submit" className="w-full h-11 bg-gradient-primary" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : "Registrar saída"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

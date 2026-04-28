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
import { Card } from "@/components/ui/card";
import { GpsCapture, type Coords } from "@/components/GpsCapture";
import { SignaturePad } from "@/components/SignaturePad";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/app/retorno/$viaturaId")({
  component: Retorno,
});

function Retorno() {
  const { viaturaId } = Route.useParams();
  const navigate = useNavigate();
  const { aprovado } = useAuth();
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 16));
  const [km, setKm] = useState("");
  const [local, setLocal] = useState("");
  const [coords, setCoords] = useState<Coords>(null);
  const [assinatura, setAssinatura] = useState<string | null>(null);

  const { data: aberta, isLoading } = useQuery({
    queryKey: ["aberta", viaturaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utilizacoes")
        .select("*, viaturas(modelo, cor), condutores(nome)")
        .eq("viatura_id", viaturaId)
        .is("data_retorno", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!aberta) return;
    if (!aprovado) return toast.error("Sua conta precisa ser aprovada pelo administrador.");
    if (!km || !data) return toast.error("Preencha KM e data");
    if (!assinatura) return toast.error("A assinatura do condutor é obrigatória");
    const kmNum = parseInt(km, 10);
    if (kmNum < aberta.km_inicial) return toast.error(`KM final deve ser ≥ ${aberta.km_inicial}`);
    setBusy(true);
    const { error } = await supabase
      .from("utilizacoes")
      .update({
        data_retorno: new Date(data).toISOString(),
        km_final: kmNum,
        local_estacionamento: local || null,
        latitude_estacionamento: coords?.lat ?? null,
        longitude_estacionamento: coords?.lng ?? null,
        assinatura_retorno: assinatura,
      })
      .eq("id", aberta.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Retorno registrado com assinatura");
    navigate({ to: "/app" });
  }

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>;
  }
  if (!aberta) {
    return (
      <div className="space-y-4">
        <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4"/>Voltar</Link>
        <Card className="p-5 text-center text-muted-foreground">Não há saída em aberto para esta viatura.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4"/> Voltar
      </Link>
      <h1 className="text-2xl font-bold">Retorno da Viatura</h1>

      <Card className="p-4 bg-secondary/40 text-sm space-y-1">
        <div className="font-semibold">{(aberta as any).viaturas?.modelo} — {(aberta as any).viaturas?.cor}</div>
        <div className="text-muted-foreground">Condutor: {(aberta as any).condutores?.nome}</div>
        <div className="text-muted-foreground">Saída: {formatDateTime(aberta.data_saida)}</div>
        <div className="text-muted-foreground">KM inicial: {aberta.km_inicial.toLocaleString("pt-BR")}</div>
        <div className="text-muted-foreground">Local: {aberta.local_saida}</div>
      </Card>

      <Card className="p-5 shadow-card">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <Label>KM final</Label>
              <Input type="number" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} placeholder={String(aberta.km_inicial)} />
            </div>
          </div>

          <GpsCapture
            value={coords}
            onChange={setCoords}
            localValue={local}
            onLocalChange={setLocal}
          />

          <SignaturePad
            value={assinatura}
            onChange={setAssinatura}
            label="Assinatura do condutor"
          />

          <Button type="submit" className="w-full h-11 bg-gradient-primary" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : "Confirmar retorno"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

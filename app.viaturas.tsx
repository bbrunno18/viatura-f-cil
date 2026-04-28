import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Car, Plus, Loader2, PowerOff, Power } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/app/viaturas")({
  component: ViaturasAdmin,
});

function ViaturasAdmin() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [modelo, setModelo] = useState("");
  const [cor, setCor] = useState("");
  const [placa, setPlaca] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["viaturas-manage"],
    queryFn: async () => (await supabase.from("viaturas").select("*").order("modelo")).data ?? [],
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!modelo || !cor) return toast.error("Modelo e cor são obrigatórios");
    setBusy(true);
    const { error } = await supabase.from("viaturas").insert({ modelo, cor, placa: placa || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Viatura cadastrada");
    setModelo(""); setCor(""); setPlaca("");
    qc.invalidateQueries({ queryKey: ["viaturas-manage"] });
  }

  async function toggle(id: string, ativa: boolean) {
    if (!isAdmin) return toast.error("Apenas administradores podem alterar.");
    const { error } = await supabase.from("viaturas").update({ ativa: !ativa }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["viaturas-manage"] });
  }

  return (
    <div className="space-y-5">
      <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4"/> Voltar</Link>
      <h1 className="text-2xl font-bold">Viaturas</h1>

      {isAdmin ? (
        <Card className="p-5 shadow-card">
          <form onSubmit={add} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Plus className="h-4 w-4 text-primary"/> Adicionar viatura</div>
            <div>
              <Label>Modelo</Label>
              <Input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ex.: Toyota Hilux"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cor</Label>
                <Input value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Branca"/>
              </div>
              <div>
                <Label>Placa (opc.)</Label>
                <Input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC-1D23"/>
              </div>
            </div>
            <Button disabled={busy} className="w-full bg-gradient-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : "Cadastrar"}
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="p-4 bg-muted/40 text-sm text-muted-foreground">
          Apenas administradores podem cadastrar novas viaturas.
        </Card>
      )}

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto"/>
      ) : (
        <div className="space-y-2">
          {data?.map((v) => (
            <Card key={v.id} className={`p-3 flex items-center gap-3 shadow-card ${!v.ativa && "opacity-60"}`}>
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center"><Car className="h-5 w-5 text-primary"/></div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{v.modelo}</div>
                <div className="text-xs text-muted-foreground">{v.cor}{v.placa ? ` · ${v.placa}` : ""}{!v.ativa && " · inativa"}</div>
              </div>
              {isAdmin && (
                <Button size="icon" variant="ghost" onClick={() => toggle(v.id, v.ativa)} aria-label="Alternar ativa">
                  {v.ativa ? <PowerOff className="h-4 w-4 text-destructive"/> : <Power className="h-4 w-4 text-success"/>}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
      {!isAdmin && (
        <p className="text-xs text-muted-foreground text-center">Apenas administradores podem ativar/desativar viaturas.</p>
      )}
    </div>
  );
}

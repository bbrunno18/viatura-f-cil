import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSalvarSecao, useSecao } from "@/hooks/useSecao";

/** Só administradores veem este cartão. Fica em branco até alguém preencher. */
export function SecaoSettings() {
  const { secao } = useSecao();
  const salvar = useSalvarSecao();
  const [valor, setValor] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setValor(secao), [secao]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const v = await salvar(valor);
      toast.success(v ? `Seção definida: ${v}` : "Seção removida do nome do app");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4 shadow-card">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold">Identificação da seção</div>
            <p className="text-xs text-muted-foreground">
              O app se chama <b>Easy Patrol</b>. Se preencher a seção (ex.: COLOG), ela aparece junto ao nome no
              cabeçalho, no login e nos relatórios. Deixe em branco para não exibir.
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="secao">Seção / setor</Label>
            <Input
              id="secao"
              value={valor}
              maxLength={40}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ex.: COLOG"
            />
          </div>
          <Button type="submit" disabled={busy || valor.trim() === secao} className="bg-gradient-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

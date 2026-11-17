import { useState } from "react";
import { Copy, Dices, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const EMPTY = { nome: "", email: "", secretaria: "", senha: "", perfil: "user" as "user" | "admin" };

function gerarSenha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const buf = new Uint32Array(10);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join("");
}

export function AddUsuarioDialog() {
  const { isMaster } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [criado, setCriado] = useState<{ email: string; senha: string; perfil: string } | null>(null);

  function reset(o: boolean) {
    setOpen(o);
    if (!o) {
      setForm(EMPTY);
      setCriado(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (form.nome.trim().length < 2) return toast.error("Informe o nome do usuário.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast.error("E-mail inválido.");
    if (form.senha.length < 6) return toast.error("A senha provisória deve ter pelo menos 6 caracteres.");
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("admin_criar_usuario", {
      _email: email,
      _nome: form.nome.trim(),
      _senha: form.senha,
      _perfil: form.perfil,
      _secretaria: form.secretaria.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Usuário criado e aprovado");
    setCriado({ email, senha: form.senha, perfil: form.perfil });
    qc.invalidateQueries({ queryKey: ["admin-all"] });
  }

  async function copiar() {
    if (!criado) return;
    const txt = `Easy Patrol — acesso\nE-mail: ${criado.email}\nSenha provisória: ${criado.senha}\nEndereço: ${window.location.origin}\nNo primeiro acesso você deverá criar uma nova senha.`;
    try {
      await navigator.clipboard.writeText(txt);
      toast.success("Dados de acesso copiados");
    } catch {
      toast.error("Não foi possível copiar. Anote os dados manualmente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-primary">
          <UserPlus className="h-4 w-4 mr-1" /> Adicionar usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{criado ? "Usuário criado" : "Adicionar usuário"}</DialogTitle>
          <DialogDescription>
            {criado
              ? "Envie os dados de acesso à pessoa. Esta senha não será mostrada de novo."
              : "A conta já nasce aprovada, com senha provisória que a pessoa precisa trocar no primeiro acesso."}
          </DialogDescription>
        </DialogHeader>

        {criado ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-secondary/40 p-3 text-sm space-y-1">
              <div><span className="text-muted-foreground">E-mail:</span> <b>{criado.email}</b></div>
              <div><span className="text-muted-foreground">Senha provisória:</span> <b className="font-mono">{criado.senha}</b></div>
              <div><span className="text-muted-foreground">Perfil:</span> <b>{criado.perfil === "admin" ? "Administrador" : "Usuário"}</b></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copiar}>
                <Copy className="h-4 w-4 mr-1.5" /> Copiar dados
              </Button>
              <Button className="flex-1 bg-gradient-primary" onClick={() => reset(false)}>Concluir</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label htmlFor="u-nome">Nome</Label>
              <Input id="u-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} autoComplete="off" />
            </div>
            <div>
              <Label htmlFor="u-email">E-mail</Label>
              <Input id="u-email" type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" placeholder="nome@mj.gov.br" />
            </div>
            <div>
              <Label htmlFor="u-sec">Secretaria / setor (opcional)</Label>
              <Input id="u-sec" value={form.secretaria} onChange={(e) => setForm({ ...form, secretaria: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="u-senha">Senha provisória</Label>
              <div className="flex gap-2">
                <Input id="u-senha" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} autoComplete="off" className="font-mono" />
                <Button type="button" variant="outline" onClick={() => setForm({ ...form, senha: gerarSenha() })} title="Gerar senha">
                  <Dices className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <fieldset>
              <legend className="text-sm font-medium mb-1.5">Perfil</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v: "user", t: "Usuário", d: "Registra saídas, retornos e abastecimentos" },
                  { v: "admin", t: "Administrador", d: isMaster ? "Gerencia usuários, viaturas e relatórios" : "Somente o Master pode criar" },
                ] as const).map((o) => {
                  const disabled = o.v === "admin" && !isMaster;
                  const active = form.perfil === o.v;
                  return (
                    <label
                      key={o.v}
                      className={`rounded-xl border p-3 text-left cursor-pointer transition-colors ${active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <input type="radio" name="perfil" className="sr-only" checked={active} disabled={disabled} onChange={() => setForm({ ...form, perfil: o.v })} />
                      <div className="text-sm font-semibold">{o.t}</div>
                      <div className="text-[11px] text-muted-foreground leading-snug">{o.d}</div>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <Button type="submit" disabled={busy} className="w-full h-11 bg-gradient-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar usuário"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

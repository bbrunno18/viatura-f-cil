import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/trocar-senha")({
  component: TrocarSenha,
});

function TrocarSenha() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 8) return toast.error("A nova senha deve ter pelo menos 8 caracteres");
    if (password === "123456") return toast.error("Escolha uma senha diferente da provisória");
    if (password !== confirm) return toast.error("As senhas não coincidem");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha alterada com sucesso");
    navigate({ to: "/app" });
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-7 text-sidebar-foreground">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-elegant mb-4">
            <ShieldAlert className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">Altere sua senha</h1>
          <p className="text-sm text-sidebar-foreground/75 mt-1">
            Você entrou com uma senha provisória. Por segurança, defina uma nova senha para continuar.
          </p>
        </div>
        <div className="bg-card rounded-2xl shadow-elegant p-6">
          <form onSubmit={handle} className="space-y-4">
            <div>
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
              <p className="text-xs text-muted-foreground mt-1">Mínimo de 8 caracteres.</p>
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar nova senha</Label>
              <Input id="confirm" name="confirm" type="password" minLength={8} autoComplete="new-password" required />
            </div>
            <Button type="submit" className="w-full h-11 bg-gradient-primary" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => signOut()}>
              Sair
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

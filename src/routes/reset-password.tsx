import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

const schema = z.object({
  password: z.string().min(6, "Mínimo de 6 caracteres").max(100),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ password: fd.get("password") });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const confirm = fd.get("confirm") as string;
    if (confirm !== parsed.data.password) return toast.error("As senhas não coincidem");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha redefinida com sucesso");
    navigate({ to: "/app" });
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-7 text-sidebar-foreground">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-elegant mb-4">
            <Shield className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">Nova senha</h1>
          <p className="text-sm text-sidebar-foreground/75 mt-1">Defina uma nova senha para sua conta</p>
        </div>
        <div className="bg-card rounded-2xl shadow-elegant p-6">
          <form onSubmit={handle} className="space-y-4">
            <div>
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" name="password" type="password" minLength={6} required />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input id="confirm" name="confirm" type="password" minLength={6} required />
            </div>
            <Button type="submit" className="w-full h-11 bg-gradient-primary" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redefinir senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

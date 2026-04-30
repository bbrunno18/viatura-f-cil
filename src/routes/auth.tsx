import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import logoMJ from "@/assets/logo-mj.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo de 6 caracteres").max(100),
});
const signupSchema = loginSchema.extend({
  nome: z.string().trim().min(2, "Informe seu nome").max(100),
  secretaria: z.string().trim().min(2, "Informe sua secretaria").max(100),
});
const forgotSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"auth" | "forgot">("auth");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta");
    navigate({ to: "/app" });
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      nome: fd.get("nome"),
      email: fd.get("email"),
      password: fd.get("password"),
      secretaria: fd.get("secretaria"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { nome: parsed.data.nome, secretaria: parsed.data.secretaria },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Aguarde aprovação do administrador para utilizar o app.");
    navigate({ to: "/app" });
  }

  async function handleForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = forgotSchema.safeParse({ email: fd.get("email") });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Se o email estiver cadastrado, você receberá o link de redefinição.");
    setMode("auth");
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <div className="flex-1 flex items-center justify-center p-5 safe-top">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-7 text-sidebar-foreground">
            <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/85 mb-3">
              Ministério da Justiça e Segurança Pública
            </div>
            <div className="mx-auto h-24 w-24 rounded-2xl bg-white flex items-center justify-center shadow-elegant mb-4 overflow-hidden">
              <img src={logoMJ} alt="Easy Patrol" className="h-full w-full object-cover" />
            </div>
            <h1 className="font-display text-3xl font-bold">Frota COLOG</h1>
            <p className="text-sm text-sidebar-foreground/75 mt-1 tracking-wide uppercase">
              Controle inteligente de viaturas
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-elegant p-6">
            {mode === "forgot" ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <button type="button" onClick={() => setMode("auth")} className="inline-flex items-center text-sm text-muted-foreground mb-1">
                  <ArrowLeft className="h-4 w-4 mr-1"/> Voltar
                </button>
                <h2 className="font-display font-bold text-xl">Recuperar senha</h2>
                <p className="text-sm text-muted-foreground">Enviaremos um link para o e-mail cadastrado.</p>
                <div>
                  <Label htmlFor="email-f">E-mail</Label>
                  <Input id="email-f" name="email" type="email" required />
                </div>
                <Button type="submit" className="w-full h-11 bg-gradient-primary" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
                </Button>
              </form>
            ) : (
              <Tabs defaultValue="login">
                <TabsList className="grid grid-cols-2 w-full mb-5">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" name="email" type="email" autoComplete="email" required />
                    </div>
                    <div>
                      <Label htmlFor="password">Senha</Label>
                      <Input id="password" name="password" type="password" autoComplete="current-password" required />
                    </div>
                    <Button type="submit" className="w-full h-11 bg-gradient-primary" disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="w-full text-sm text-primary hover:underline text-center font-medium"
                    >
                      Esqueci minha senha
                    </button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <Label htmlFor="nome">Nome completo</Label>
                      <Input id="nome" name="nome" required />
                    </div>
                    <div>
                      <Label htmlFor="secretaria">Secretaria</Label>
                      <Input id="secretaria" name="secretaria" placeholder="Ex.: Secretaria de Segurança" required />
                    </div>
                    <div>
                      <Label htmlFor="email-s">E-mail</Label>
                      <Input id="email-s" name="email" type="email" autoComplete="email" required />
                    </div>
                    <div>
                      <Label htmlFor="password-s">Senha</Label>
                      <Input id="password-s" name="password" type="password" autoComplete="new-password" minLength={6} required />
                    </div>
                    <Button type="submit" className="w-full h-11 bg-gradient-primary" disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Sua conta ficará <b>pendente</b> até aprovação do administrador.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <p className="text-center text-xs text-sidebar-foreground/60 mt-6">
            Acesso restrito ao pessoal autorizado
          </p>
        </motion.div>
      </div>
    </div>
  );
}

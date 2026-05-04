import { supabase } from "@/integrations/supabase/client";

export async function logAction(
  acao: string,
  opts?: { tabela?: string; registro_id?: string | null; detalhes?: Record<string, unknown> },
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("audit_log").insert({
    user_id: u.user.id,
    user_email: u.user.email ?? null,
    acao,
    tabela: opts?.tabela ?? null,
    registro_id: opts?.registro_id ?? null,
    detalhes: (opts?.detalhes ?? null) as never,
  });
}

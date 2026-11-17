import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "secao_nome";

// A tabela app_settings ainda não está nos tipos gerados do Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const settings = () => (supabase as any).from("app_settings");

/** Nome da seção/órgão (ex.: "COLOG"). Vazio até um administrador preencher. */
export function useSecao() {
  const { data, isLoading } = useQuery({
    queryKey: ["app-settings", KEY],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string> => {
      const { data, error } = await settings().select("value").eq("key", KEY).maybeSingle();
      if (error) return "";
      return ((data?.value as string | null) ?? "").trim();
    },
  });
  return { secao: data ?? "", isLoading };
}

export function useSalvarSecao() {
  const qc = useQueryClient();
  return async (valor: string) => {
    const value = valor.trim().slice(0, 40);
    const { data: u } = await supabase.auth.getUser();
    const { error } = value
      ? await settings().upsert({ key: KEY, value, updated_at: new Date().toISOString(), updated_by: u.user?.id ?? null })
      : await settings().delete().eq("key", KEY);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["app-settings", KEY] });
    return value;
  };
}

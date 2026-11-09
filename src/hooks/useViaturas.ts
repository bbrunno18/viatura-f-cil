import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ViaturasTable = Database["public"]["Tables"]["viaturas"];

// Colunas reais da tabela `viaturas`:
// id, modelo, cor, placa, ativa, km_atual, created_at
export type Viatura = ViaturasTable["Row"];
export type NovaViatura = Pick<ViaturasTable["Insert"], "modelo" | "cor" | "placa" | "km_atual">;

const QUERY_KEY = ["viaturas-manage"];

// ─── busca todas as viaturas ──────────────────────────────────────────────────
export function useViaturas() {
  return useQuery<Viatura[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("viaturas")
        .select("*")
        .order("modelo");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos de cache
  });
}

// ─── adicionar ───────────────────────────────────────────────────────────────
export function useAddViatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NovaViatura) => {
      const { error } = await supabase
        .from("viaturas")
        .insert({ ...payload, ativa: true });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Viatura cadastrada com sucesso.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── editar ───────────────────────────────────────────────────────────────────
export function useEditViatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: ViaturasTable["Update"] & { id: string }) => {
      const { error } = await supabase
        .from("viaturas")
        .update(payload)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Viatura atualizada com sucesso.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── toggle ativa ─────────────────────────────────────────────────────────────
export function useToggleViatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase
        .from("viaturas")
        .update({ ativa: !ativa })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Status atualizado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

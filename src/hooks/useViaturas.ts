import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Viatura = {
  id: string;
  modelo: string;
  cor: string;
  placa: string | null;
  ativa: boolean;
  latitude: number | null;
  longitude: number | null;
  endereco: string | null;
  foto_url: string | null;
  updated_at: string | null;
};

export type AuditEntry = {
  id: string;
  viatura_id: string;
  changed_by: string | null;
  changed_at: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
};

// ─── busca todas as viaturas ──────────────────────────────────────────────────
export function useViaturas() {
  return useQuery<Viatura[]>({
    queryKey: ["viaturas-manage"],
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

// ─── busca histórico de uma viatura ──────────────────────────────────────────
export function useViaturaAudit(viaturaId: string | null) {
  return useQuery<AuditEntry[]>({
    queryKey: ["viatura-audit", viaturaId],
    enabled: !!viaturaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("viaturas_audit")
        .select("*")
        .eq("viatura_id", viaturaId!)
        .order("changed_at", { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

// ─── adicionar ───────────────────────────────────────────────────────────────
export function useAddViatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      modelo: string;
      cor: string;
      placa: string | null;
      latitude: number | null;
      longitude: number | null;
      endereco: string | null;
      foto_url: string | null;
    }) => {
      const { error } = await supabase
        .from("viaturas")
        .insert({ ...payload, ativa: true });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["viaturas-manage"] });
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
    }: Partial<Viatura> & { id: string }) => {
      const { error } = await supabase
        .from("viaturas")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["viaturas-manage"] });
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
        .update({ ativa: !ativa, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["viaturas-manage"] });
      toast.success("Status atualizado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── upload de foto ───────────────────────────────────────────────────────────
export async function uploadFotoViatura(
  viaturaId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${viaturaId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("viaturas")
    .upload(path, file, { upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("viaturas").getPublicUrl(path);
  return data.publicUrl;
}

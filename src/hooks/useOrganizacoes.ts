import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Empresas cadastradas (somente o Master enxerga todas; as demais veem só a própria). */
export function useOrganizacoes() {
  return useQuery({
    queryKey: ["organizacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizacoes").select("*").order("nome");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

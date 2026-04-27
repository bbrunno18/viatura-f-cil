import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Fuel, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDateTime, weekday } from "@/lib/format";

export const Route = createFileRoute("/app/abastecimentos/")({
  component: AbastecimentosList,
});

function AbastecimentosList() {
  const { data, isLoading } = useQuery({
    queryKey: ["abastecimentos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("abastecimentos")
        .select("*, viaturas(modelo, cor), condutores(nome)")
        .order("data_abastecimento", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Abastecimentos</h1>
        <Link to="/app/abastecimentos/novo">
          <Button size="sm" className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1"/> Novo</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0,1,2].map(i => <Card key={i} className="h-24 bg-muted animate-pulse"/>)}</div>
      ) : data?.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Fuel className="h-10 w-10 mx-auto opacity-30 mb-2"/>
          Nenhum abastecimento ainda.
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.map((a: any) => (
            <Card key={a.id} className="p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{a.viaturas?.modelo}</div>
                  <div className="text-xs text-muted-foreground">{a.viaturas?.cor} · {a.condutores?.nome}</div>
                  <div className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1 capitalize">
                    <Calendar className="h-3 w-3"/> {weekday(a.data_abastecimento)} · {formatDateTime(a.data_abastecimento)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-bold text-lg text-primary">{formatBRL(Number(a.valor_total))}</div>
                  <div className="text-xs text-muted-foreground">{Number(a.litros).toFixed(2)} L</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

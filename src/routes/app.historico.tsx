import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/historico")({
  component: Historico,
});

function Historico() {
  const [filterViatura, setFilterViatura] = useState<string>("all");

  const { data: viaturas } = useQuery({
    queryKey: ["viaturas-all"],
    queryFn: async () => (await supabase.from("viaturas").select("*").order("modelo")).data ?? [],
  });

  const { data, isLoading } = useQuery({
    queryKey: ["historico", filterViatura],
    queryFn: async () => {
      let q = supabase
        .from("utilizacoes")
        .select("*, viaturas(modelo, cor), condutores(nome)")
        .order("data_saida", { ascending: false })
        .limit(100);
      if (filterViatura !== "all") q = q.eq("viatura_id", filterViatura);
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Histórico</h1>

      <div>
        <Select value={filterViatura} onValueChange={setFilterViatura}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as viaturas</SelectItem>
            {viaturas?.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.modelo} — {v.cor}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
      ) : data?.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">Sem registros.</Card>
      ) : (
        <div className="space-y-3">
          {data?.map((u: any, i) => {
            const aberta = !u.data_retorno;
            const km = u.km_final != null ? u.km_final - u.km_inicial : null;
            return (
              <motion.div key={u.id} initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} transition={{delay: i*0.02}}>
                <Card className="p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{u.viaturas?.modelo} — {u.viaturas?.cor}</div>
                      <div className="text-xs text-muted-foreground">{u.condutores?.nome}</div>
                    </div>
                    {aberta
                      ? <Badge className="bg-warning/15 text-warning-foreground border border-warning/40 hover:bg-warning/15">Em uso</Badge>
                      : <Badge variant="secondary">Concluído</Badge>}
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>Saída: <span className="text-foreground">{formatDateTime(u.data_saida)}</span></span>
                    </div>
                    <div className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 mt-0.5"/> {u.local_saida}</div>
                    {!aberta && (
                      <>
                        <div className="flex items-center gap-1.5"><ArrowRight className="h-3.5 w-3.5"/> Retorno: <span className="text-foreground">{formatDateTime(u.data_retorno)}</span></div>
                        {u.local_estacionamento && (
                          <div className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 mt-0.5 text-primary"/> {u.local_estacionamento}</div>
                        )}
                      </>
                    )}
                    <div className="text-foreground font-medium pt-1">
                      KM {u.km_inicial.toLocaleString("pt-BR")}{u.km_final != null ? ` → ${u.km_final.toLocaleString("pt-BR")}` : ""}
                      {km != null && <span className="text-primary ml-2">({km.toLocaleString("pt-BR")} km)</span>}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

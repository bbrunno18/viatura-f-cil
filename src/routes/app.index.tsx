import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Car, ArrowRight, MapPin, Fuel, Plus, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

type Viatura = {
  id: string;
  modelo: string;
  cor: string;
  placa: string | null;
  ativa: boolean;
};

type AbertaInfo = {
  viatura_id: string;
  data_saida: string;
  local_saida: string;
  km_inicial: number;
  condutores: { nome: string } | null;
};

type UltimaInfo = {
  viatura_id: string;
  data_retorno: string | null;
  local_estacionamento: string | null;
  latitude_estacionamento: number | null;
  longitude_estacionamento: number | null;
  km_final: number | null;
};

function Dashboard() {
  const { aprovado, profileLoaded } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [vRes, abertasRes, ultimasRes] = await Promise.all([
        supabase.from("viaturas").select("*").eq("ativa", true).order("modelo"),
        supabase
          .from("utilizacoes")
          .select("viatura_id, data_saida, local_saida, km_inicial, condutores(nome)")
          .is("data_retorno", null),
        supabase
          .from("utilizacoes")
          .select("viatura_id, data_retorno, local_estacionamento, latitude_estacionamento, longitude_estacionamento, km_final")
          .not("data_retorno", "is", null)
          .order("data_retorno", { ascending: false })
          .limit(50),
      ]);

      const viaturas = (vRes.data ?? []) as Viatura[];
      const abertas = (abertasRes.data ?? []) as AbertaInfo[];
      const ultimas = (ultimasRes.data ?? []) as UltimaInfo[];

      const ultimaPorViatura = new Map<string, UltimaInfo>();
      for (const u of ultimas) {
        if (!ultimaPorViatura.has(u.viatura_id)) ultimaPorViatura.set(u.viatura_id, u);
      }
      const abertaPorViatura = new Map(abertas.map((a) => [a.viatura_id, a]));

      return { viaturas, abertaPorViatura, ultimaPorViatura };
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel da Frota</h1>
        <p className="text-sm text-muted-foreground">Selecione uma viatura para registrar saída ou retorno.</p>
      </div>

      {profileLoaded && !aprovado && (
        <Card className="p-4 bg-warning/10 border-warning/40 flex gap-3 items-start">
          <Clock className="h-5 w-5 text-warning-foreground shrink-0 mt-0.5"/>
          <div className="text-sm">
            <div className="font-semibold">Conta pendente de aprovação</div>
            <div className="text-muted-foreground">Você só poderá registrar saídas, retornos e abastecimentos após o administrador aprovar sua conta.</div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/app/saida">
          <Card className="p-4 bg-gradient-primary text-primary-foreground border-0 shadow-elegant hover:scale-[1.02] transition-transform">
            <Plus className="h-6 w-6 mb-2" />
            <div className="font-semibold">Nova Saída</div>
            <div className="text-xs opacity-80">Registrar utilização</div>
          </Card>
        </Link>
        <Link to="/app/abastecimentos/novo">
          <Card className="p-4 bg-gradient-accent text-accent-foreground border-0 shadow-elegant hover:scale-[1.02] transition-transform">
            <Fuel className="h-6 w-6 mb-2" />
            <div className="font-semibold">Abastecer</div>
            <div className="text-xs opacity-80">Registrar abastecimento</div>
          </Card>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg">Viaturas</h2>
          <Link to="/app/viaturas" className="text-xs text-primary font-medium">Gerenciar</Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="p-4 h-28 animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {data?.viaturas.map((v, idx) => {
              const aberta = data.abertaPorViatura.get(v.id);
              const ultima = data.ultimaPorViatura.get(v.id);
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="p-4 shadow-card overflow-hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3 min-w-0 flex-1">
                        <div className="h-11 w-11 shrink-0 rounded-xl bg-secondary flex items-center justify-center">
                          <Car className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{v.modelo}</div>
                          <div className="text-xs text-muted-foreground">
                            {v.cor}{v.placa ? ` · ${v.placa}` : ""}
                          </div>
                        </div>
                      </div>
                      {aberta ? (
                        <span className="shrink-0 rounded-full bg-warning/15 text-warning-foreground border border-warning/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Em uso
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-success/15 text-success border border-success/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Disponível
                        </span>
                      )}
                    </div>

                    {aberta ? (
                      <div className="mt-3 rounded-lg bg-warning/10 p-3 text-xs space-y-1">
                        <div className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5"/> Saiu em {formatDateTime(aberta.data_saida)}</div>
                        <div>Condutor: <span className="font-semibold">{aberta.condutores?.nome ?? "—"}</span></div>
                        <div>KM inicial: {aberta.km_inicial.toLocaleString("pt-BR")}</div>
                        <div className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 mt-0.5"/> {aberta.local_saida}</div>
                      </div>
                    ) : ultima ? (
                      <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-xs space-y-1">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 text-primary"/>
                          <span>{ultima.local_estacionamento ?? "Local não informado"}</span>
                        </div>
                        {ultima.latitude_estacionamento != null && (
                          <a
                            href={`https://www.google.com/maps?q=${ultima.latitude_estacionamento},${ultima.longitude_estacionamento}`}
                            target="_blank" rel="noreferrer"
                            className="text-primary font-medium underline-offset-2 hover:underline"
                          >Ver no mapa</a>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-muted-foreground">Sem registros ainda.</div>
                    )}

                    <div className="mt-3 flex gap-2">
                      {aberta ? (
                        <Link to="/app/retorno/$viaturaId" params={{ viaturaId: v.id }} className="flex-1">
                          <Button className="w-full bg-gradient-primary" size="sm">
                            Registrar retorno <ArrowRight className="h-4 w-4 ml-1"/>
                          </Button>
                        </Link>
                      ) : (
                        <Link to="/app/saida" search={{ viaturaId: v.id }} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            Registrar saída
                          </Button>
                        </Link>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { ChevronLeft, MapPin, Loader2, ExternalLink, Copy, Radio } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/app/mapa")({
  component: MapaPage,
});

const icon = L.divIcon({
  className: "",
  html: `<div style="background:#c89b3c;border:2px solid #fff;width:22px;height:22px;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [points, map]);
  return null;
}

const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

function MapaPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["mapa-frota"],
    queryFn: async () => {
      // últimas posições conhecidas (em uso = saída sem retorno; sem posição porque GPS é capturado no retorno).
      // Então mostramos a ÚLTIMA posição registrada (último retorno) por viatura, mais o status atual.
      const [vRes, abertasRes, ultRes, vivoRes] = await Promise.all([
        supabase.from("viaturas").select("id, modelo, cor, placa").eq("ativa", true),
        supabase.from("utilizacoes").select("viatura_id, data_saida, local_saida, condutores(nome)").is("data_retorno", null),
        supabase.from("utilizacoes").select("viatura_id, latitude_estacionamento, longitude_estacionamento, local_estacionamento, data_retorno").not("latitude_estacionamento", "is", null).order("data_retorno", { ascending: false }).limit(200),
        (supabase as any).from("viatura_posicao").select("viatura_id, latitude, longitude, velocidade, atualizado_em"),
      ]);
      const vivos = new Map<string, any>((vivoRes.data ?? []).map((x: any) => [x.viatura_id, x]));
      const abertas = new Map((abertasRes.data ?? []).map((a: any) => [a.viatura_id, a]));
      const ultimas = new Map<string, any>();
      for (const u of ultRes.data ?? []) if (!ultimas.has(u.viatura_id)) ultimas.set(u.viatura_id, u);
      const pontos = (vRes.data ?? []).flatMap((v: any) => {
        const u = ultimas.get(v.id);
        const vivo = vivos.get(v.id);
        const emUso = abertas.has(v.id);
        const aoVivo = !!vivo && emUso && Date.now() - new Date(vivo.atualizado_em).getTime() < 3 * 60 * 1000;
        if (vivo && emUso) {
          return [{
            id: v.id, modelo: v.modelo, cor: v.cor, placa: v.placa,
            lat: vivo.latitude as number, lng: vivo.longitude as number,
            local: aoVivo ? "Posição ao vivo" : "Última posição recebida (sinal perdido)",
            quando: vivo.atualizado_em, emUso, aoVivo,
            velocidade: vivo.velocidade as number | null,
            condutor: abertas.get(v.id)?.condutores?.nome,
          }];
        }
        if (!u) return [];
        return [{
          aoVivo: false, velocidade: null as number | null,
          id: v.id,
          modelo: v.modelo,
          cor: v.cor,
          placa: v.placa,
          lat: u.latitude_estacionamento as number,
          lng: u.longitude_estacionamento as number,
          local: u.local_estacionamento,
          quando: u.data_retorno,
          emUso: abertas.has(v.id),
          condutor: abertas.get(v.id)?.condutores?.nome,
        }];
      });
      return pontos;
    },
    refetchInterval: 30000,
  });

  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("posicao-frota")
      .on("postgres_changes", { event: "*", schema: "public", table: "viatura_posicao" }, () => {
        qc.invalidateQueries({ queryKey: ["mapa-frota"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const center = useMemo<[number, number]>(() => {
    if (data && data.length) return [data[0].lat, data[0].lng];
    return [-15.793, -47.882]; // Brasília
  }, [data]);

  const points: [number, number][] = (data ?? []).map((p) => [p.lat, p.lng]);

  return (
    <div className="space-y-4">
      <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4"/> Voltar</Link>
      <div>
        <h1 className="text-2xl font-bold">Mapa da Frota</h1>
        <p className="text-sm text-muted-foreground">Viaturas em uso aparecem ao vivo (celular do condutor); as demais mostram o local de estacionamento.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
      ) : (
        <Card className="overflow-hidden shadow-elegant" style={{ height: 480 }}>
          <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds points={points} />
            {data?.map((p) => (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={icon}>
                <Popup>
                  <div className="text-xs">
                    <div className="font-bold">{p.modelo} {p.placa ? `· ${p.placa}` : ""}</div>
                    <div>Status: <strong>{p.aoVivo ? "Em uso · ao vivo" : p.emUso ? "Em uso" : "Disponível"}</strong></div>
                    {p.emUso && <div>Condutor: {p.condutor ?? "—"}</div>}
                    <div>Local: {p.local ?? "—"}</div>
                    <div>Registrado: {formatDateTime(p.quando)}</div>
                    <a href={mapsLink(p.lat, p.lng)} target="_blank" rel="noreferrer" style={{ color: "#1a73e8", fontWeight: 600 }}>Abrir no Google Maps</a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((p) => (
            <Card key={p.id} className="p-3 shadow-card flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{p.modelo}{p.placa ? ` · ${p.placa}` : ""}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {p.aoVivo && <Radio className="h-3 w-3 text-success animate-pulse"/>}
                  {p.aoVivo ? "Ao vivo" : p.emUso ? "Em uso" : "Estacionada"} · {formatDateTime(p.quando)}
                  {p.aoVivo && p.velocidade != null && p.velocidade > 0 ? ` · ${Math.round(p.velocidade * 3.6)} km/h` : ""}
                </div>
              </div>
              <Button size="sm" variant="outline" className="gap-1" asChild>
                <a href={mapsLink(p.lat, p.lng)} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5"/> Google Maps</a>
              </Button>
              <Button size="icon" variant="ghost" aria-label="Copiar link" onClick={() => { navigator.clipboard?.writeText(mapsLink(p.lat, p.lng)); toast.success("Link copiado"); }}>
                <Copy className="h-4 w-4"/>
              </Button>
            </Card>
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <Card className="p-4 text-sm text-muted-foreground flex gap-2 items-start">
          <MapPin className="h-4 w-4 mt-0.5"/> Ainda não há posições. Assim que um condutor registrar a saída e permitir a localização, a viatura aparece aqui ao vivo.
        </Card>
      )}
    </div>
  );
}

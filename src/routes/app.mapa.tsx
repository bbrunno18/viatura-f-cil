import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { ChevronLeft, MapPin, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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

function MapaPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["mapa-frota"],
    queryFn: async () => {
      // últimas posições conhecidas (em uso = saída sem retorno; sem posição porque GPS é capturado no retorno).
      // Então mostramos a ÚLTIMA posição registrada (último retorno) por viatura, mais o status atual.
      const [vRes, abertasRes, ultRes] = await Promise.all([
        supabase.from("viaturas").select("id, modelo, cor, placa").eq("ativa", true),
        supabase.from("utilizacoes").select("viatura_id, data_saida, local_saida, condutores(nome)").is("data_retorno", null),
        supabase.from("utilizacoes").select("viatura_id, latitude_estacionamento, longitude_estacionamento, local_estacionamento, data_retorno").not("latitude_estacionamento", "is", null).order("data_retorno", { ascending: false }).limit(200),
      ]);
      const abertas = new Map((abertasRes.data ?? []).map((a: any) => [a.viatura_id, a]));
      const ultimas = new Map<string, any>();
      for (const u of ultRes.data ?? []) if (!ultimas.has(u.viatura_id)) ultimas.set(u.viatura_id, u);
      const pontos = (vRes.data ?? []).flatMap((v: any) => {
        const u = ultimas.get(v.id);
        if (!u) return [];
        return [{
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
        <p className="text-sm text-muted-foreground">Última posição registrada de cada viatura. Atualiza a cada 30s.</p>
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
                    <div>Status: <strong>{p.emUso ? "Em uso" : "Disponível"}</strong></div>
                    {p.emUso && <div>Condutor: {p.condutor ?? "—"}</div>}
                    <div>Local: {p.local ?? "—"}</div>
                    <div>Registrado: {formatDateTime(p.quando)}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </Card>
      )}

      {data && data.length === 0 && (
        <Card className="p-4 text-sm text-muted-foreground flex gap-2 items-start">
          <MapPin className="h-4 w-4 mt-0.5"/> Ainda não há posições GPS registradas. As coordenadas são capturadas no momento do retorno da viatura.
        </Card>
      )}
    </div>
  );
}

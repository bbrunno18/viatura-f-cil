import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type EstadoRastreio = "inativo" | "pedindo" | "ativo" | "negado" | "sem-gps";

const INTERVALO_MS = 15000; // no máximo uma gravação a cada 15 s
const DIST_MIN_M = 20;

function distM(a: [number, number], b: [number, number]) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Enquanto o usuário logado tem uma saída em aberto, envia a posição do celular
 * para viatura_posicao (a tela Mapa mostra em tempo real). Precisa do app aberto.
 */
export function useRastreamento() {
  const { user } = useAuth();
  const [estado, setEstado] = useState<EstadoRastreio>("inativo");
  const ultimo = useRef<{ t: number; p: [number, number] } | null>(null);

  const { data: aberta } = useQuery({
    queryKey: ["minha-saida-aberta", user?.id],
    enabled: !!user,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data } = await supabase
        .from("utilizacoes")
        .select("id, viatura_id")
        .eq("registrado_por", user!.id)
        .is("data_retorno", null)
        .order("data_saida", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  const utilizacaoId = aberta?.id;
  const viaturaId = aberta?.viatura_id;

  useEffect(() => {
    if (!user || !utilizacaoId || !viaturaId) { setEstado("inativo"); return; }
    if (typeof navigator === "undefined" || !navigator.geolocation) { setEstado("sem-gps"); return; }
    setEstado("pedindo");
    ultimo.current = null;

    let wake: any = null;
    const pedirWake = async () => {
      try { wake = await (navigator as any).wakeLock?.request("screen"); } catch { /* opcional */ }
    };
    pedirWake();
    const onVis = () => { if (document.visibilityState === "visible") pedirWake(); };
    document.addEventListener("visibilitychange", onVis);

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        setEstado("ativo");
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        const agora = Date.now();
        const u = ultimo.current;
        if (u && agora - u.t < INTERVALO_MS && distM(u.p, p) < DIST_MIN_M) return;
        if (u && agora - u.t < 5000) return;
        ultimo.current = { t: agora, p };
        await (supabase as any).from("viatura_posicao").upsert({
          viatura_id: viaturaId,
          utilizacao_id: utilizacaoId,
          user_id: user.id,
          latitude: p[0],
          longitude: p[1],
          precisao: pos.coords.accuracy ?? null,
          velocidade: pos.coords.speed ?? null,
          atualizado_em: new Date().toISOString(),
        });
      },
      (err) => setEstado(err.code === 1 ? "negado" : "pedindo"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );

    return () => {
      navigator.geolocation.clearWatch(id);
      document.removeEventListener("visibilitychange", onVis);
      try { wake?.release?.(); } catch { /* */ }
    };
  }, [user, utilizacaoId, viaturaId]);

  return { estado, emSaida: !!utilizacaoId };
}

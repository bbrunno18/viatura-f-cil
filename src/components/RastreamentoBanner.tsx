import { Radio, AlertTriangle } from "lucide-react";
import { useRastreamento } from "@/hooks/useRastreamento";

export function RastreamentoBanner() {
  const { estado, emSaida } = useRastreamento();
  if (!emSaida) return null;
  if (estado === "negado" || estado === "sem-gps") {
    return (
      <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs flex gap-2 items-start">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
        <span>
          {estado === "negado"
            ? "Localização bloqueada: a empresa não consegue ver onde a viatura está. Permita a localização nas configurações do navegador."
            : "Este aparelho não tem GPS disponível."}
        </span>
      </div>
    );
  }
  return (
    <div className="mb-3 rounded-lg border border-success/30 bg-success/10 p-3 text-xs flex gap-2 items-center">
      <Radio className={`h-4 w-4 text-success shrink-0 ${estado === "ativo" ? "animate-pulse" : ""}`} />
      <span>
        {estado === "ativo"
          ? "Localização ao vivo ativa enquanto a viatura estiver em uso. Mantenha o app aberto."
          : "Aguardando permissão de localização… toque em Permitir."}
      </span>
    </div>
  );
}

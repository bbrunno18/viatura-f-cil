import { useState } from "react";
import { MapPin, Loader2, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export type Coords = { lat: number; lng: number } | null;

export function GpsCapture({
  value,
  onChange,
  localValue,
  onLocalChange,
  label = "Local de estacionamento",
}: {
  value: Coords;
  onChange: (c: Coords) => void;
  localValue: string;
  onLocalChange: (v: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  function capturar() {
    if (!navigator.geolocation) {
      toast.error("GPS não disponível neste dispositivo");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBusy(false);
        toast.success("Localização capturada");
      },
      (err) => {
        setBusy(false);
        toast.error(err.message || "Falha ao capturar GPS");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        placeholder="Ex.: Garagem da sede"
        value={localValue}
        onChange={(e) => onLocalChange(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <Button type="button" onClick={capturar} variant="outline" size="sm" disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <LocateFixed className="h-4 w-4"/>}
          {value ? "Recapturar GPS" : "Capturar GPS"}
        </Button>
        {value && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5"/> {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        )}
      </div>
    </div>
  );
}

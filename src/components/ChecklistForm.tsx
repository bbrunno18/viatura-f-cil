import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ChecklistStatus = "ok" | "atencao" | "avariado";

export interface ChecklistItem {
  id: string;
  label: string;
  status: ChecklistStatus;
  obs?: string;
}

export const DEFAULT_CHECKLIST_ITEMS: { id: string; label: string }[] = [
  { id: "pneus", label: "Pneus e calibragem" },
  { id: "freios", label: "Freios" },
  { id: "farois", label: "Faróis e lanternas" },
  { id: "lataria", label: "Lataria e pintura" },
  { id: "vidros", label: "Vidros e retrovisores" },
  { id: "combustivel", label: "Nível de combustível" },
  { id: "oleo", label: "Nível de óleo / fluidos" },
  { id: "estepe", label: "Estepe, macaco e triângulo" },
  { id: "extintor", label: "Extintor (validade)" },
  { id: "documentos", label: "Documentos do veículo (CRLV)" },
  { id: "limpeza", label: "Limpeza interna e externa" },
];

export function buildEmptyChecklist(): ChecklistItem[] {
  return DEFAULT_CHECKLIST_ITEMS.map((i) => ({ ...i, status: "ok" as ChecklistStatus, obs: "" }));
}

const STATUS_CONFIG: Record<ChecklistStatus, { label: string; icon: typeof CheckCircle2; cls: string; ring: string }> = {
  ok: { label: "OK", icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", ring: "ring-emerald-500" },
  atencao: { label: "Atenção", icon: AlertTriangle, cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", ring: "ring-amber-500" },
  avariado: { label: "Avariado", icon: XCircle, cls: "bg-destructive/10 text-destructive border-destructive/30", ring: "ring-destructive" },
};

export function ChecklistForm({
  items,
  onChange,
  title = "Checklist do veículo",
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  title?: string;
}) {
  function update(idx: number, patch: Partial<ChecklistItem>) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">{title}</Label>
        <span className="text-xs text-muted-foreground">{items.filter((i) => i.status === "ok").length}/{items.length} OK</span>
      </div>
      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={it.id} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium flex-1">{it.label}</span>
              <div className="flex gap-1">
                {(Object.keys(STATUS_CONFIG) as ChecklistStatus[]).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  const Icon = cfg.icon;
                  const active = it.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update(idx, { status: s })}
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border transition-all",
                        active ? `${cfg.cls} ring-2 ${cfg.ring}` : "bg-background text-muted-foreground border-border hover:bg-secondary",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {it.status !== "ok" && (
              <Input
                placeholder="Observação (opcional)"
                value={it.obs ?? ""}
                onChange={(e) => update(idx, { obs: e.target.value })}
                className="h-8 text-xs"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

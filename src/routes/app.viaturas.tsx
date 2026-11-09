// src/routes/app.viaturas.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ChevronLeft,
  Car,
  Plus,
  Loader2,
  PowerOff,
  Power,
  Search,
  FileDown,
  MapPin,
  AlertTriangle,
  Shield,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useViaturas,
  useAddViatura,
  useToggleViatura,
  type Viatura,
} from "@/hooks/useViaturas";
import { viaturaSchema } from "@/lib/validators/viatura";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── helpers ──────────────────────────────────────────────────────────────────
// A tabela `viaturas` não guarda coordenadas; a localização vem das utilizações
// (local de estacionamento no retorno). Aqui o atalho busca pelo modelo + placa.
function openGoogleMaps(v: Viatura) {
  if (v.placa) {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        v.modelo + " " + v.placa,
      )}`,
      "_blank",
    );
  } else {
    toast.info("Sem localização disponível para esta viatura.");
  }
}

function exportToCSV(data: Viatura[]) {
  const header = ["Modelo", "Cor", "Placa", "KM atual", "Status"];
  const rows = data.map((v) => [
    v.modelo,
    v.cor,
    v.placa ?? "—",
    v.km_atual ?? "—",
    v.ativa ? "Ativa" : "Inativa",
  ]);
  const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "viaturas.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV exportado com sucesso!");
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

function AppHeader() {
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-card">
          <Car className="h-7 w-7 text-primary-foreground" />
        </div>
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
          ✓
        </span>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Viaturas</h1>
        <p className="text-sm text-muted-foreground">Gestão de frota policial</p>
      </div>
    </div>
  );
}

function AddViaturaButton({ isAdmin }: { isAdmin: boolean }) {
  const add = useAddViatura();
  const [modelo, setModelo] = useState("");
  const [cor, setCor] = useState("");
  const [placa, setPlaca] = useState("");
  const [kmAtual, setKmAtual] = useState("");
  const [open, setOpen] = useState(false);

  // Somente administradores (admin/master) veem o botão.
  // O banco também bloqueia o insert para os demais (RLS is_admin_or_master).
  if (!isAdmin) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = viaturaSchema.safeParse({
      modelo,
      cor,
      placa: placa.replace(/\s/g, ""),
      km_atual: kmAtual.trim() === "" ? null : kmAtual,
    });
    if (!parsed.success)
      return toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    const { modelo: m, cor: c, placa: p, km_atual } = parsed.data;
    await add.mutateAsync({
      modelo: m,
      cor: c,
      placa: p || null,
      km_atual: km_atual ?? null,
    });
    setModelo("");
    setCor("");
    setPlaca("");
    setKmAtual("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-primary">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar viatura
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar viatura</DialogTitle>
          <DialogDescription>
            Cadastre uma nova viatura na frota. Modelo e cor são obrigatórios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Modelo *</Label>
            <Input
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Ex.: Toyota Hilux"
              className="mt-1"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cor *</Label>
              <Input
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                placeholder="Branca"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Placa (opcional)</Label>
              <Input
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="ABC-1D23"
                maxLength={8}
                className="mt-1 font-mono"
              />
            </div>
          </div>
          <div>
            <Label>KM atual (opcional)</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={kmAtual}
              onChange={(e) => setKmAtual(e.target.value)}
              placeholder="Ex.: 45230"
              className="mt-1"
            />
          </div>
          <Button
            type="submit"
            disabled={add.isPending}
            className="w-full bg-gradient-primary"
          >
            {add.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Cadastrar viatura"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "emerald" | "red";
}) {
  const cls = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  }[color];

  return (
    <div className={`flex-1 rounded-xl px-3 py-2 ${cls}`}>
      <div className="text-lg font-bold leading-none">{value}</div>
      <div className="text-[11px] uppercase tracking-wide mt-1 opacity-80">
        {label}
      </div>
    </div>
  );
}

function Toolbar({
  search,
  onSearch,
  data,
  total,
  ativas,
}: {
  search: string;
  onSearch: (v: string) => void;
  data: Viatura[];
  total: number;
  ativas: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <StatPill label="Total" value={total} color="blue" />
        <StatPill label="Ativas" value={ativas} color="emerald" />
        <StatPill label="Inativas" value={total - ativas} color="red" />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar por modelo, cor ou placa…"
            className="pl-9 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => exportToCSV(data)}
          title="Exportar CSV"
          className="shrink-0"
        >
          <FileDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ViaturaCard({
  v,
  isAdmin,
  onToggle,
  toggling,
}: {
  v: Viatura;
  isAdmin: boolean;
  onToggle: (v: Viatura) => void;
  toggling: boolean;
}) {
  return (
    <Card
      className={`p-3 flex items-center gap-3 shadow-card transition-opacity ${
        !v.ativa ? "opacity-60" : ""
      }`}
    >
      <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
        <Car className="h-5 w-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{v.modelo}</span>
          <Badge
            variant={v.ativa ? "default" : "secondary"}
            className="text-[10px] px-1.5 py-0 h-4 shrink-0"
          >
            {v.ativa ? "Ativa" : "Inativa"}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {v.cor}
          {v.placa && (
            <>
              {" · "}
              <span className="font-mono">{v.placa}</span>
            </>
          )}
          {v.km_atual != null && (
            <>
              {" · "}
              {v.km_atual.toLocaleString("pt-BR")} km
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => openGoogleMaps(v)}
          title="Abrir no Google Maps"
          className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40"
        >
          <MapPin className="h-4 w-4" />
        </Button>

        {isAdmin && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onToggle(v)}
            disabled={toggling}
            title={v.ativa ? "Desativar viatura" : "Ativar viatura"}
            className={`h-9 w-9 rounded-xl ${
              v.ativa
                ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                : "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            }`}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : v.ativa ? (
              <PowerOff className="h-4 w-4" />
            ) : (
              <Power className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}

function ConfirmToggleDialog({
  viatura,
  onConfirm,
  onCancel,
}: {
  viatura: Viatura | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const open = viatura !== null;
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {viatura?.ativa ? "Desativar viatura?" : "Ativar viatura?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {viatura?.ativa
              ? `A viatura ${viatura?.modelo}${
                  viatura?.placa ? ` (${viatura.placa})` : ""
                } será marcada como inativa e não aparecerá nas seleções.`
              : `A viatura ${viatura?.modelo}${
                  viatura?.placa ? ` (${viatura?.placa})` : ""
                } será reativada.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {viatura?.ativa ? "Sim, desativar" : "Sim, ativar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────
export const Route = createFileRoute("/app/viaturas")({
  component: ViaturasAdmin,
});

function ViaturasAdmin() {
  const { isAdmin } = useAuth();
  const { data = [], isLoading, isError, error } = useViaturas();
  const toggle = useToggleViatura();

  const [search, setSearch] = useState("");
  const [pendingToggle, setPendingToggle] = useState<Viatura | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data;
    return data.filter(
      (v) =>
        v.modelo.toLowerCase().includes(q) ||
        v.cor.toLowerCase().includes(q) ||
        (v.placa ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  const total = data.length;
  const ativas = data.filter((v) => v.ativa).length;

  async function confirmToggle() {
    if (!pendingToggle) return;
    setTogglingId(pendingToggle.id);
    try {
      await toggle.mutateAsync({
        id: pendingToggle.id,
        ativa: pendingToggle.ativa,
      });
    } finally {
      setTogglingId(null);
      setPendingToggle(null);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/app"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </Link>

      <AppHeader />

      <AddViaturaButton isAdmin={isAdmin} />

      {!isLoading && !isError && data.length > 0 && (
        <Toolbar
          search={search}
          onSearch={setSearch}
          data={filtered}
          total={total}
          ativas={ativas}
        />
      )}

      {isLoading ? (
        <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Carregando viaturas…
        </div>
      ) : isError ? (
        <Card className="p-4 flex items-start gap-3 border-destructive/40 bg-destructive/5">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-destructive">
              Erro ao carregar viaturas
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {(error as Error)?.message}
            </div>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
          <Car className="h-8 w-8 opacity-40" />
          {search
            ? "Nenhuma viatura encontrada."
            : "Nenhuma viatura cadastrada."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <ViaturaCard
              key={v.id}
              v={v}
              isAdmin={isAdmin}
              onToggle={(viatura) => isAdmin && setPendingToggle(viatura)}
              toggling={togglingId === v.id}
            />
          ))}
        </div>
      )}

      {!isAdmin && data.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Apenas administradores podem ativar ou desativar viaturas.
        </p>
      )}

      <ConfirmToggleDialog
        viatura={pendingToggle}
        onConfirm={confirmToggle}
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Sun, Moon, Monitor, Type, Contrast } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePreferences } from "@/lib/preferences";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/preferencias")({
  component: Preferencias,
});

function Preferencias() {
  const { theme, setTheme, fontScale, setFontScale, highContrast, setHighContrast } = usePreferences();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Preferências</h1>
        <p className="text-sm text-muted-foreground">Tema, tamanho da fonte e acessibilidade.</p>
      </div>

      <Card className="p-5 shadow-card space-y-3">
        <div className="font-semibold flex items-center gap-2"><Sun className="h-4 w-4 text-accent"/> Tema</div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: "light", label: "Claro", icon: Sun },
            { v: "dark", label: "Escuro", icon: Moon },
            { v: "system", label: "Sistema", icon: Monitor },
          ] as const).map(({ v, label, icon: I }) => (
            <Button
              key={v}
              variant={theme === v ? "default" : "outline"}
              onClick={() => setTheme(v)}
              className={cn("h-auto py-3 flex-col gap-1", theme === v && "bg-gradient-primary")}
            >
              <I className="h-4 w-4"/>
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-5 shadow-card space-y-3">
        <div className="font-semibold flex items-center gap-2"><Type className="h-4 w-4 text-primary"/> Tamanho da fonte</div>
        <div className="grid grid-cols-4 gap-2">
          {(["sm","md","lg","xl"] as const).map((s) => (
            <Button
              key={s}
              variant={fontScale === s ? "default" : "outline"}
              onClick={() => setFontScale(s)}
              className={cn(fontScale === s && "bg-gradient-primary")}
            >
              {s === "sm" ? "A-" : s === "md" ? "A" : s === "lg" ? "A+" : "A++"}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-5 shadow-card flex items-center gap-3">
        <Contrast className="h-5 w-5 text-primary"/>
        <div className="flex-1">
          <Label className="font-semibold">Alto contraste</Label>
          <div className="text-xs text-muted-foreground">Maior legibilidade em ambientes externos.</div>
        </div>
        <Switch checked={highContrast} onCheckedChange={setHighContrast} />
      </Card>
    </div>
  );
}

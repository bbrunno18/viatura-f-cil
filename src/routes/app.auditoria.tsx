import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/app/auditoria")({
  component: Auditoria,
});

function Auditoria() {
  const { isMaster } = useAuth();
  const { data } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(300);
      return data ?? [];
    },
    enabled: isMaster,
  });

  if (!isMaster) {
    return (
      <div className="space-y-4">
        <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4"/> Voltar</Link>
        <Card className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-destructive"/>Acesso restrito ao Administrador Master.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4"/> Voltar</Link>
      <div>
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">Últimas 300 ações registradas no sistema.</p>
      </div>
      <div className="space-y-2">
        {data?.length === 0 && <Card className="p-4 text-center text-sm text-muted-foreground">Sem eventos.</Card>}
        {data?.map((l: any) => (
          <Card key={l.id} className="p-3 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-xs font-semibold">{l.acao}</div>
                <div className="text-xs text-muted-foreground truncate">{l.user_email}{l.tabela ? ` · ${l.tabela}` : ""}</div>
              </div>
              <div className="text-[10px] text-muted-foreground shrink-0">{formatDateTime(l.created_at)}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

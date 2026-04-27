import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="flex flex-col items-center gap-3 text-sidebar-foreground">
          <Shield className="h-10 w-10 animate-pulse text-accent" />
          <div className="text-sm uppercase tracking-widest">Carregando…</div>
        </div>
      </div>
    );
  }
  return <Navigate to={user ? "/app" : "/auth"} />;
}

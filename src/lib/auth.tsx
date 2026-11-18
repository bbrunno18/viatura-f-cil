import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const MASTER_EMAIL = "brunno.almeida@mj.gov.br";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isMaster: boolean;
  aprovado: boolean;
  orgId: string | null;
  orgNome: string | null;
  profileLoaded: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [aprovado, setAprovado] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgNome, setOrgNome] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadProfile(sess.user.id, sess.user.email ?? null), 0);
      } else {
        setIsAdmin(false);
        setIsMaster(false);
        setAprovado(false);
        setOrgId(null);
        setOrgNome(null);
        setProfileLoaded(false);
      }
    });

    // Só termina o "loading" depois de carregar papéis/aprovação: sem isso, ao recarregar uma
    // página de admin (ex.: /app/admin) o isAdmin ainda é false e o app redirecionava para o início.
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        try {
          await loadProfile(data.session.user.id, data.session.user.email ?? null);
        } catch {
          /* mantém o app utilizável mesmo se o perfil falhar */
        }
      }
      setLoading(false);
    });

    // Atualiza papel/aprovação ao voltar para a aba (caso Master tenha mudado)
    const onFocus = () => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) loadProfile(data.session.user.id, data.session.user.email ?? null);
      });
    };
    window.addEventListener("focus", onFocus);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  async function loadProfile(uid: string, email?: string | null) {
    const [rolesRes, profRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("aprovado, org_id").eq("id", uid).maybeSingle(),
    ]);
    const roles = rolesRes.data ?? [];
    const emailIsMaster = (email ?? "").trim().toLowerCase() === MASTER_EMAIL;
    const master = emailIsMaster || roles.some((r: any) => r.role === "master");
    const admin = roles.some((r: any) => r.role === "admin") || master;
    setIsMaster(master);
    setIsAdmin(admin);
    setAprovado(master || admin || !!profRes.data?.aprovado);
    const oid = profRes.data?.org_id ?? null;
    setOrgId(oid);
    if (oid) {
      const { data: org } = await supabase.from("organizacoes").select("nome").eq("id", oid).maybeSingle();
      setOrgNome(org?.nome?.trim() || null);
    } else {
      setOrgNome(null);
    }
    setProfileLoaded(true);
  }

  return (
    <AuthContext.Provider
      value={{
        user, session, isAdmin, isMaster, aprovado, orgId, orgNome, profileLoaded, loading,
        signOut: async () => { await supabase.auth.signOut(); },
        refreshProfile: async () => { if (user) await loadProfile(user.id); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}

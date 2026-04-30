import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isMaster: boolean;
  aprovado: boolean;
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
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setIsAdmin(false);
        setIsMaster(false);
        setAprovado(false);
        setProfileLoaded(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfile(data.session.user.id);
      setLoading(false);
    });

    // Atualiza papel/aprovação ao voltar para a aba (caso Master tenha mudado)
    const onFocus = () => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) loadProfile(data.session.user.id);
      });
    };
    window.addEventListener("focus", onFocus);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  async function loadProfile(uid: string) {
    const [rolesRes, profRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("aprovado").eq("id", uid).maybeSingle(),
    ]);
    const roles = rolesRes.data ?? [];
    const master = roles.some((r: any) => r.role === "master");
    const admin = roles.some((r: any) => r.role === "admin") || master;
    setIsMaster(master);
    setIsAdmin(admin);
    setAprovado(master || admin || !!profRes.data?.aprovado);
    setProfileLoaded(true);
  }

  return (
    <AuthContext.Provider
      value={{
        user, session, isAdmin, isMaster, aprovado, profileLoaded, loading,
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

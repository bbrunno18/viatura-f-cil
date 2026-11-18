import { useAuth } from "@/lib/auth";

/** Nome da empresa/órgão do usuário logado (vazio para o Master ou antes de entrar). */
export function useSecao() {
  const { orgNome, loading } = useAuth();
  return { secao: orgNome ?? "", isLoading: loading };
}

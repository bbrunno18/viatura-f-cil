-- Corrige: "permission denied for function is_admin_or_master" (e is_approved / has_role).
--
-- A migração 20260427133214 revogou EXECUTE dessas funções de PUBLIC, anon e
-- authenticated. Porém as políticas RLS (utilizacoes, abastecimentos, viaturas,
-- profiles, storage etc.) chamam essas funções enquanto são avaliadas com o papel
-- do usuário logado (authenticated). Sem EXECUTE, qualquer INSERT/UPDATE/DELETE
-- coberto por essas políticas falha, por exemplo ao confirmar o retorno da viatura.
--
-- As funções são SECURITY DEFINER com search_path fixo e só retornam boolean, então
-- é seguro conceder EXECUTE apenas ao papel authenticated (anon e PUBLIC continuam
-- sem acesso).

GRANT EXECUTE ON FUNCTION public.is_admin_or_master(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

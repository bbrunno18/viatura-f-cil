-- SCRIPT MANUAL (não é migração): rodar UMA vez no editor SQL do banco.
-- Não fica em supabase/migrations de propósito, porque apaga dados.
--
-- O que faz:
--   1) Devolve ao usuário logado a permissão de executar as funções usadas pelas
--      políticas RLS (corrige "permission denied for function is_admin_or_master").
--   2) Lista as saídas ainda abertas (viaturas "em uso").
--   3) Apaga as saídas abertas de exemplo, o que volta as viaturas para "Disponíveis".
--
-- O editor SQL roda com privilégio de administrador, então este script funciona mesmo
-- enquanto o aplicativo ainda está com o erro de permissão.

-- 1) Permissões (idempotente)
GRANT EXECUTE ON FUNCTION public.is_admin_or_master(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2) CONFIRA antes de apagar: deve aparecer apenas a saída de exemplo
SELECT u.id, v.modelo, v.placa, u.data_saida, u.km_inicial, u.local_saida
FROM public.utilizacoes u
JOIN public.viaturas v ON v.id = u.viatura_id
WHERE u.data_retorno IS NULL
ORDER BY u.data_saida;

-- 3) Remove as saídas abertas (a viatura volta a ficar disponível)
DELETE FROM public.utilizacoes
WHERE data_retorno IS NULL
RETURNING id, viatura_id, data_saida;

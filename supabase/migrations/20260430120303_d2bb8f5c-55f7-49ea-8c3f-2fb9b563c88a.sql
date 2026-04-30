-- Permitir que MASTER faça tudo que admin faz (update/delete em viaturas, condutores, abastecimentos, utilizacoes)

-- viaturas
DROP POLICY IF EXISTS "Admins update viaturas" ON public.viaturas;
DROP POLICY IF EXISTS "Admins delete viaturas" ON public.viaturas;
CREATE POLICY "Admin master update viaturas" ON public.viaturas FOR UPDATE TO authenticated USING (public.is_admin_or_master(auth.uid()));
CREATE POLICY "Admin master delete viaturas" ON public.viaturas FOR DELETE TO authenticated USING (public.is_admin_or_master(auth.uid()));

-- condutores
DROP POLICY IF EXISTS "Admins update condutores" ON public.condutores;
DROP POLICY IF EXISTS "Admins delete condutores" ON public.condutores;
CREATE POLICY "Admin master update condutores" ON public.condutores FOR UPDATE TO authenticated USING (public.is_admin_or_master(auth.uid()));
CREATE POLICY "Admin master delete condutores" ON public.condutores FOR DELETE TO authenticated USING (public.is_admin_or_master(auth.uid()));

-- abastecimentos (já tem update master, falta delete)
DROP POLICY IF EXISTS "Admins delete abastecimentos" ON public.abastecimentos;
CREATE POLICY "Admin master delete abastecimentos" ON public.abastecimentos FOR DELETE TO authenticated USING (public.is_admin_or_master(auth.uid()));

-- utilizacoes
DROP POLICY IF EXISTS "Admins delete utilizacoes" ON public.utilizacoes;
CREATE POLICY "Admin master delete utilizacoes" ON public.utilizacoes FOR DELETE TO authenticated USING (public.is_admin_or_master(auth.uid()));

-- Também garantir que admins vejam todas as roles (já existe). Permitir master gerenciar roles já existe.
-- Limpar role 'user' redundante quando o usuário também é master
DELETE FROM public.user_roles ur
WHERE ur.role = 'user'
  AND EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = ur.user_id AND ur2.role IN ('admin','master'));

-- Posição ao vivo da viatura: o celular do condutor (com a saída em aberto) envia a localização;
-- uma linha por viatura (última posição). Isolamento por empresa via org_scope.
CREATE TABLE IF NOT EXISTS public.viatura_posicao (
  viatura_id uuid PRIMARY KEY REFERENCES public.viaturas(id) ON DELETE CASCADE,
  utilizacao_id uuid REFERENCES public.utilizacoes(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  precisao real,
  velocidade real,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.viatura_posicao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS posicao_select ON public.viatura_posicao;
CREATE POLICY posicao_select ON public.viatura_posicao FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()));

DROP POLICY IF EXISTS posicao_insert ON public.viatura_posicao;
CREATE POLICY posicao_insert ON public.viatura_posicao FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.utilizacoes u
    WHERE u.viatura_id = viatura_posicao.viatura_id AND u.data_retorno IS NULL AND u.registrado_por = auth.uid()));

DROP POLICY IF EXISTS posicao_update ON public.viatura_posicao;
CREATE POLICY posicao_update ON public.viatura_posicao FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.utilizacoes u
    WHERE u.viatura_id = viatura_posicao.viatura_id AND u.data_retorno IS NULL AND u.registrado_por = auth.uid()))
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS org_scope ON public.viatura_posicao;
CREATE POLICY org_scope ON public.viatura_posicao AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.viatura_visivel(viatura_id)) WITH CHECK (public.viatura_visivel(viatura_id));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.viatura_posicao;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

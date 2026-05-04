-- Reservas de viaturas
CREATE TABLE public.reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viatura_id uuid NOT NULL,
  condutor_id uuid NOT NULL,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  observacao text,
  status text NOT NULL DEFAULT 'agendada',
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view reservas" ON public.reservas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Approved insert reservas" ON public.reservas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = registrado_por AND public.is_approved(auth.uid()));
CREATE POLICY "Admin master update reservas" ON public.reservas FOR UPDATE TO authenticated
  USING (public.is_admin_or_master(auth.uid()) OR auth.uid() = registrado_por);
CREATE POLICY "Admin master delete reservas" ON public.reservas FOR DELETE TO authenticated
  USING (public.is_admin_or_master(auth.uid()));

-- Manutenções
CREATE TABLE public.manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viatura_id uuid NOT NULL,
  tipo text NOT NULL,
  descricao text,
  data_servico date NOT NULL,
  proxima_data date,
  km_servico integer,
  proxima_km integer,
  custo numeric,
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view manutencoes" ON public.manutencoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin master insert manutencoes" ON public.manutencoes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_master(auth.uid()));
CREATE POLICY "Admin master update manutencoes" ON public.manutencoes FOR UPDATE TO authenticated
  USING (public.is_admin_or_master(auth.uid()));
CREATE POLICY "Admin master delete manutencoes" ON public.manutencoes FOR DELETE TO authenticated
  USING (public.is_admin_or_master(auth.uid()));

-- Auditoria
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  acao text NOT NULL,
  tabela text,
  registro_id uuid,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master view audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'master'::app_role));
CREATE POLICY "Approved insert audit" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Adicionar coluna km_servico em viaturas para checklist
ALTER TABLE public.viaturas ADD COLUMN IF NOT EXISTS km_atual integer;
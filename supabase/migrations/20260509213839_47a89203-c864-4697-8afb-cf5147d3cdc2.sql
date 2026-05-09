-- Condutores: campos de CNH
ALTER TABLE public.condutores
  ADD COLUMN IF NOT EXISTS cnh_numero text,
  ADD COLUMN IF NOT EXISTS cnh_categoria text,
  ADD COLUMN IF NOT EXISTS cnh_validade date,
  ADD COLUMN IF NOT EXISTS telefone text;

-- Multas
CREATE TABLE IF NOT EXISTS public.multas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viatura_id uuid NOT NULL,
  condutor_id uuid,
  data_infracao date NOT NULL,
  descricao text NOT NULL,
  local text,
  valor numeric NOT NULL DEFAULT 0,
  situacao text NOT NULL DEFAULT 'aberta',
  observacao text,
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.multas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view multas" ON public.multas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin master insert multas" ON public.multas
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_master(auth.uid()));
CREATE POLICY "Admin master update multas" ON public.multas
  FOR UPDATE TO authenticated USING (public.is_admin_or_master(auth.uid()));
CREATE POLICY "Admin master delete multas" ON public.multas
  FOR DELETE TO authenticated USING (public.is_admin_or_master(auth.uid()));

-- Documentos da viatura
CREATE TABLE IF NOT EXISTS public.documentos_viatura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viatura_id uuid NOT NULL,
  tipo text NOT NULL,
  numero text,
  validade date,
  arquivo_url text,
  observacao text,
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documentos_viatura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view documentos" ON public.documentos_viatura
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin master insert documentos" ON public.documentos_viatura
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_master(auth.uid()));
CREATE POLICY "Admin master update documentos" ON public.documentos_viatura
  FOR UPDATE TO authenticated USING (public.is_admin_or_master(auth.uid()));
CREATE POLICY "Admin master delete documentos" ON public.documentos_viatura
  FOR DELETE TO authenticated USING (public.is_admin_or_master(auth.uid()));

-- Storage bucket privado para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth view documentos bucket" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documentos');
CREATE POLICY "Admin upload documentos bucket" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos' AND public.is_admin_or_master(auth.uid()));
CREATE POLICY "Admin update documentos bucket" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'documentos' AND public.is_admin_or_master(auth.uid()));
CREATE POLICY "Admin delete documentos bucket" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documentos' AND public.is_admin_or_master(auth.uid()));
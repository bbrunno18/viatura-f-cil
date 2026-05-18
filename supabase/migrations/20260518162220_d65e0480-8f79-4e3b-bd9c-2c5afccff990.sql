
-- Phase 2: checklist, hodômetro photo, signature, termo
ALTER TABLE public.utilizacoes
  ADD COLUMN IF NOT EXISTS checklist_saida jsonb,
  ADD COLUMN IF NOT EXISTS checklist_retorno jsonb,
  ADD COLUMN IF NOT EXISTS foto_hodometro_saida text,
  ADD COLUMN IF NOT EXISTS foto_hodometro_retorno text,
  ADD COLUMN IF NOT EXISTS fotos_saida text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fotos_retorno text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assinatura_saida text,
  ADD COLUMN IF NOT EXISTS termo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('utilizacoes', 'utilizacoes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated view utilizacoes files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'utilizacoes');

CREATE POLICY "Authenticated upload utilizacoes files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'utilizacoes' AND public.is_approved(auth.uid()));

CREATE POLICY "Admin master delete utilizacoes files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'utilizacoes' AND public.is_admin_or_master(auth.uid()));

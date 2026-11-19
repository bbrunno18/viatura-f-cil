-- Logo de cada empresa cliente (enviada somente pelo Master).
ALTER TABLE public.organizacoes ADD COLUMN IF NOT EXISTS logo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos-empresas', 'logos-empresas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS logos_empresas_leitura ON storage.objects;
CREATE POLICY logos_empresas_leitura ON storage.objects FOR SELECT
  USING (bucket_id = 'logos-empresas');

DROP POLICY IF EXISTS logos_empresas_master_insert ON storage.objects;
CREATE POLICY logos_empresas_master_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos-empresas' AND public.is_master(auth.uid()));

DROP POLICY IF EXISTS logos_empresas_master_update ON storage.objects;
CREATE POLICY logos_empresas_master_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'logos-empresas' AND public.is_master(auth.uid()));

DROP POLICY IF EXISTS logos_empresas_master_delete ON storage.objects;
CREATE POLICY logos_empresas_master_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'logos-empresas' AND public.is_master(auth.uid()));

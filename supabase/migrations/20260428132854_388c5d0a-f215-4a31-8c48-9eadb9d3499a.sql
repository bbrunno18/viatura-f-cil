
-- 1. Incidentes
CREATE TABLE IF NOT EXISTS public.incidentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viatura_id uuid NOT NULL,
  condutor_id uuid,
  utilizacao_id uuid,
  descricao text NOT NULL,
  data_ocorrencia timestamptz NOT NULL DEFAULT now(),
  fotos text[] NOT NULL DEFAULT '{}',
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incidentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view incidentes" ON public.incidentes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Approved insert incidentes" ON public.incidentes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = registrado_por AND public.is_approved(auth.uid()));

CREATE POLICY "Admin master update incidentes" ON public.incidentes
  FOR UPDATE TO authenticated USING (public.is_admin_or_master(auth.uid()));

CREATE POLICY "Admin master delete incidentes" ON public.incidentes
  FOR DELETE TO authenticated USING (public.is_admin_or_master(auth.uid()));

-- 2. Assinatura na utilização (data URL base64 ou path)
ALTER TABLE public.utilizacoes
  ADD COLUMN IF NOT EXISTS assinatura_retorno text;

-- 3. Storage buckets (privados)
INSERT INTO storage.buckets (id, name, public)
VALUES ('incidentes', 'incidentes', false)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket incidentes
CREATE POLICY "Auth view incidentes objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'incidentes');

CREATE POLICY "Approved upload incidentes objects" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'incidentes' AND public.is_approved(auth.uid()));

CREATE POLICY "Admin master delete incidentes objects" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'incidentes' AND public.is_admin_or_master(auth.uid()));

-- 4. Promover brunno.almeida@mj.gov.br a master (se já existir)
DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = 'brunno.almeida@mj.gov.br' LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_id, 'master')
      ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET aprovado = true WHERE id = v_id;
  END IF;
END $$;

-- 5. Trigger: ao criar conta, se for o email do master, já promove
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, secretaria, aprovado)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome',''),
    NEW.email,
    NEW.raw_user_meta_data->>'secretaria',
    CASE WHEN NEW.email = 'brunno.almeida@mj.gov.br' THEN true ELSE false END
  );
  IF NEW.email = 'brunno.almeida@mj.gov.br' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'master');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END; $$;

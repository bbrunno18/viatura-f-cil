-- Emails que já nascem aprovados e com papel master no cadastro.
-- (Mesma função já aplicada no banco do Lovable em 2026-11-10; idempotente.)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_m boolean := lower(NEW.email) IN ('brunno.almeida@mj.gov.br','cosme.marques@mj.gov.br','jorge.silva@mj.gov.br');
BEGIN
  INSERT INTO public.profiles (id, nome, email, secretaria, aprovado)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome',''), NEW.email, NEW.raw_user_meta_data->>'secretaria', is_m);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, CASE WHEN is_m THEN 'master'::app_role ELSE 'user'::app_role END);
  RETURN NEW;
END; $$;

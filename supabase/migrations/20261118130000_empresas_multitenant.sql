-- Multiempresa (SaaS): cada empresa é uma linha em `organizacoes`; logins, viaturas, condutores e
-- todos os registros pertencem a uma empresa. Master (dono do produto) vê todas.
-- Substitui o isolamento por texto livre (20261118120000) por org_id.

CREATE TABLE IF NOT EXISTS public.organizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles   ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizacoes(id);
ALTER TABLE public.viaturas   ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizacoes(id);
ALTER TABLE public.condutores ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizacoes(id);

-- Empresa inicial a partir da secretaria já em uso
INSERT INTO public.organizacoes (nome)
SELECT DISTINCT btrim(secretaria) FROM public.profiles
WHERE secretaria IS NOT NULL AND btrim(secretaria) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.organizacoes);
UPDATE public.profiles p SET org_id = o.id FROM public.organizacoes o
  WHERE p.org_id IS NULL AND lower(btrim(p.secretaria)) = lower(o.nome);
UPDATE public.condutores SET org_id = (SELECT id FROM public.organizacoes ORDER BY created_at LIMIT 1)
  WHERE org_id IS NULL AND (SELECT count(*) FROM public.organizacoes) = 1;

-- Remove o modelo anterior (texto livre)
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['viaturas','condutores','utilizacoes','abastecimentos','incidentes','manutencoes','multas','reservas','documentos_viatura'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS org_scope ON public.%I', t);
  END LOOP;
END $$;
DROP TRIGGER IF EXISTS trg_viaturas_org_ins ON public.viaturas;
DROP TRIGGER IF EXISTS trg_viaturas_org_upd ON public.viaturas;
DROP TRIGGER IF EXISTS trg_condutores_org_ins ON public.condutores;
DROP TRIGGER IF EXISTS trg_condutores_org_upd ON public.condutores;
DROP FUNCTION IF EXISTS public.viatura_visivel(uuid);
DROP FUNCTION IF EXISTS public.org_visivel(text);
DROP FUNCTION IF EXISTS public.my_org();
DROP FUNCTION IF EXISTS public.my_org_label();
DROP FUNCTION IF EXISTS public.org_key(text);
ALTER TABLE public.viaturas   DROP COLUMN IF EXISTS secretaria;
ALTER TABLE public.condutores DROP COLUMN IF EXISTS secretaria;

CREATE OR REPLACE FUNCTION public.my_org_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.org_visivel(_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_master(auth.uid()) OR (_org IS NOT NULL AND _org = public.my_org_id())
$$;

CREATE OR REPLACE FUNCTION public.viatura_visivel(_viatura_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.viaturas v WHERE v.id = _viatura_id AND public.org_visivel(v.org_id))
$$;

CREATE OR REPLACE FUNCTION public.set_org_on_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_master(auth.uid()) THEN NEW.org_id := public.my_org_id(); END IF;
  IF NEW.org_id IS NULL THEN
    RAISE EXCEPTION 'Selecione a empresa.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.lock_org_on_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_master(auth.uid()) THEN NEW.org_id := OLD.org_id; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_viaturas_org_ins BEFORE INSERT ON public.viaturas FOR EACH ROW EXECUTE FUNCTION public.set_org_on_insert();
CREATE TRIGGER trg_viaturas_org_upd BEFORE UPDATE ON public.viaturas FOR EACH ROW EXECUTE FUNCTION public.lock_org_on_update();
CREATE TRIGGER trg_condutores_org_ins BEFORE INSERT ON public.condutores FOR EACH ROW EXECUTE FUNCTION public.set_org_on_insert();
CREATE TRIGGER trg_condutores_org_upd BEFORE UPDATE ON public.condutores FOR EACH ROW EXECUTE FUNCTION public.lock_org_on_update();

GRANT EXECUTE ON FUNCTION public.my_org_id(), public.org_visivel(uuid), public.viatura_visivel(uuid) TO authenticated;

-- Isolamento (políticas RESTRITIVAS somam-se às existentes)
CREATE POLICY org_scope ON public.viaturas AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.org_visivel(org_id)) WITH CHECK (public.org_visivel(org_id));
CREATE POLICY org_scope ON public.condutores AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.org_visivel(org_id)) WITH CHECK (public.org_visivel(org_id));
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['utilizacoes','abastecimentos','incidentes','manutencoes','multas','reservas','documentos_viatura'] LOOP
    EXECUTE format('CREATE POLICY org_scope ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.viatura_visivel(viatura_id)) WITH CHECK (public.viatura_visivel(viatura_id))', t);
  END LOOP;
END $$;

-- Perfis e papéis: admin só enxerga/aprova gente da própria empresa
CREATE POLICY org_scope ON public.profiles AS RESTRICTIVE FOR ALL TO authenticated
  USING (id = auth.uid() OR public.org_visivel(org_id))
  WITH CHECK (id = auth.uid() OR public.org_visivel(org_id));
CREATE OR REPLACE FUNCTION public.user_visivel(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _uid = auth.uid() OR public.is_master(auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _uid AND p.org_id IS NOT NULL AND p.org_id = public.my_org_id())
$$;
GRANT EXECUTE ON FUNCTION public.user_visivel(uuid) TO authenticated;
CREATE POLICY org_scope ON public.user_roles AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.user_visivel(user_id)) WITH CHECK (public.user_visivel(user_id));

-- Empresas: Master gerencia; membros veem a própria
CREATE POLICY "Master manages organizacoes" ON public.organizacoes FOR ALL TO authenticated
  USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY "Members view own organizacao" ON public.organizacoes FOR SELECT TO authenticated
  USING (id = public.my_org_id());

-- Cadastro: código da empresa liga o novo login à empresa (conta fica pendente até um admin aprovar)
CREATE OR REPLACE FUNCTION public.codigo_empresa_valido(_codigo text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizacoes WHERE ativa AND codigo = upper(btrim(coalesce(_codigo, ''))))
$$;
GRANT EXECUTE ON FUNCTION public.codigo_empresa_valido(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  is_m boolean := lower(NEW.email) = 'brunno.almeida@mj.gov.br';
  v_org uuid;
BEGIN
  SELECT id INTO v_org FROM public.organizacoes
   WHERE ativa AND codigo = upper(btrim(coalesce(NEW.raw_user_meta_data->>'codigo_empresa', '')));
  INSERT INTO public.profiles (id, nome, email, secretaria, aprovado, org_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome',''), NEW.email, NEW.raw_user_meta_data->>'secretaria', is_m, CASE WHEN is_m THEN NULL ELSE v_org END);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, CASE WHEN is_m THEN 'master'::app_role ELSE 'user'::app_role END);
  RETURN NEW;
END; $$;

-- Master cria empresa
CREATE OR REPLACE FUNCTION public.admin_criar_organizacao(_nome text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_master(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o Master pode cadastrar empresas.' USING ERRCODE = '42501';
  END IF;
  IF length(btrim(coalesce(_nome, ''))) < 2 THEN RAISE EXCEPTION 'Informe o nome da empresa.'; END IF;
  INSERT INTO public.organizacoes (nome) VALUES (btrim(_nome)) RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_criar_organizacao(text) TO authenticated;

-- Criar usuário: Admin só na própria empresa; Master escolhe a empresa
DROP FUNCTION IF EXISTS public.admin_criar_usuario(text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.admin_criar_usuario(_email text, _nome text, _senha text, _perfil text, _org_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'auth' AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_email text := lower(trim(coalesce(_email, '')));
  v_nome text := trim(coalesce(_nome, ''));
  v_id uuid := gen_random_uuid();
  v_org uuid;
  v_org_nome text;
BEGIN
  IF v_caller IS NULL OR NOT public.is_admin_or_master(v_caller) THEN
    RAISE EXCEPTION 'Apenas administradores podem adicionar usuários.' USING ERRCODE = '42501';
  END IF;
  IF _perfil NOT IN ('admin', 'user') THEN RAISE EXCEPTION 'Perfil inválido. Use admin ou user.'; END IF;
  IF _perfil = 'admin' AND NOT public.is_master(v_caller) THEN
    RAISE EXCEPTION 'Apenas o Master pode criar administradores.' USING ERRCODE = '42501';
  END IF;
  v_org := CASE WHEN public.is_master(v_caller) THEN _org_id ELSE public.my_org_id() END;
  SELECT nome INTO v_org_nome FROM public.organizacoes WHERE id = v_org AND ativa;
  IF v_org_nome IS NULL THEN RAISE EXCEPTION 'Selecione uma empresa válida.'; END IF;
  IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'E-mail inválido.'; END IF;
  IF length(v_nome) < 2 THEN RAISE EXCEPTION 'Informe o nome do usuário.'; END IF;
  IF length(coalesce(_senha, '')) < 6 THEN RAISE EXCEPTION 'A senha provisória deve ter pelo menos 6 caracteres.'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'Já existe um usuário com este e-mail.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome', v_nome, 'secretaria', v_org_nome, 'must_change_password', true),
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true), now(), now(), now());

  UPDATE public.profiles SET aprovado = true, nome = v_nome, secretaria = v_org_nome, org_id = v_org WHERE id = v_id;
  DELETE FROM public.user_roles WHERE user_id = v_id AND role <> 'master';
  INSERT INTO public.user_roles (user_id, role) VALUES (v_id, _perfil::app_role) ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_log (user_id, user_email, acao, tabela, registro_id, detalhes)
  SELECT v_caller, (SELECT email FROM auth.users WHERE id = v_caller), 'criar_usuario', 'profiles', v_id,
         jsonb_build_object('email', v_email, 'perfil', _perfil, 'org_id', v_org);
  RETURN v_id;
END; $function$;

-- Isolamento por secretaria/empresa: cada organização enxerga e cadastra só as suas viaturas e condutores.
-- Master enxerga todas. Somente administradores cadastram viaturas.

CREATE OR REPLACE FUNCTION public.org_key(_t text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT NULLIF(lower(btrim(regexp_replace(coalesce(_t, ''), '\s+', ' ', 'g'))), '')
$$;

CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'master'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.my_org() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.org_key(secretaria) FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.my_org_label() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT btrim(secretaria) FROM public.profiles WHERE id = auth.uid()
$$;

ALTER TABLE public.viaturas  ADD COLUMN IF NOT EXISTS secretaria text;
ALTER TABLE public.condutores ADD COLUMN IF NOT EXISTS secretaria text;

CREATE OR REPLACE FUNCTION public.set_org_on_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF public.is_master(auth.uid()) THEN
    IF public.org_key(NEW.secretaria) IS NULL THEN
      RAISE EXCEPTION 'Informe a secretaria/empresa.' USING ERRCODE = '23514';
    END IF;
  ELSE
    NEW.secretaria := public.my_org_label();
    IF public.org_key(NEW.secretaria) IS NULL THEN
      RAISE EXCEPTION 'Seu usuário não tem secretaria/empresa definida. Fale com o Master.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.lock_org_on_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_master(auth.uid()) THEN NEW.secretaria := OLD.secretaria; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_viaturas_org_ins ON public.viaturas;
CREATE TRIGGER trg_viaturas_org_ins BEFORE INSERT ON public.viaturas FOR EACH ROW EXECUTE FUNCTION public.set_org_on_insert();
DROP TRIGGER IF EXISTS trg_viaturas_org_upd ON public.viaturas;
CREATE TRIGGER trg_viaturas_org_upd BEFORE UPDATE ON public.viaturas FOR EACH ROW EXECUTE FUNCTION public.lock_org_on_update();
DROP TRIGGER IF EXISTS trg_condutores_org_ins ON public.condutores;
CREATE TRIGGER trg_condutores_org_ins BEFORE INSERT ON public.condutores FOR EACH ROW EXECUTE FUNCTION public.set_org_on_insert();
DROP TRIGGER IF EXISTS trg_condutores_org_upd ON public.condutores;
CREATE TRIGGER trg_condutores_org_upd BEFORE UPDATE ON public.condutores FOR EACH ROW EXECUTE FUNCTION public.lock_org_on_update();

CREATE OR REPLACE FUNCTION public.org_visivel(_secretaria text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_master(auth.uid())
      OR (public.my_org() IS NOT NULL AND public.org_key(_secretaria) = public.my_org())
$$;

CREATE OR REPLACE FUNCTION public.viatura_visivel(_viatura_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.viaturas v WHERE v.id = _viatura_id AND public.org_visivel(v.secretaria))
$$;

GRANT EXECUTE ON FUNCTION public.org_key(text), public.is_master(uuid), public.my_org(),
  public.my_org_label(), public.org_visivel(text), public.viatura_visivel(uuid) TO authenticated;

-- Políticas RESTRITIVAS: somam-se (AND) às já existentes.
DROP POLICY IF EXISTS org_scope ON public.viaturas;
CREATE POLICY org_scope ON public.viaturas AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.org_visivel(secretaria)) WITH CHECK (public.org_visivel(secretaria));
DROP POLICY IF EXISTS org_scope ON public.condutores;
CREATE POLICY org_scope ON public.condutores AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.org_visivel(secretaria)) WITH CHECK (public.org_visivel(secretaria));

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['utilizacoes','abastecimentos','incidentes','manutencoes','multas','reservas','documentos_viatura'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS org_scope ON public.%I', t);
    EXECUTE format('CREATE POLICY org_scope ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.viatura_visivel(viatura_id)) WITH CHECK (public.viatura_visivel(viatura_id))', t);
  END LOOP;
END $$;

-- Admin só cria usuários na própria secretaria; Master escolhe (obrigatória para administradores).
CREATE OR REPLACE FUNCTION public.admin_criar_usuario(_email text, _nome text, _senha text, _perfil text, _secretaria text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'auth' AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_email text := lower(trim(coalesce(_email, '')));
  v_nome text := trim(coalesce(_nome, ''));
  v_id uuid := gen_random_uuid();
  v_sec text;
BEGIN
  IF v_caller IS NULL OR NOT public.is_admin_or_master(v_caller) THEN
    RAISE EXCEPTION 'Apenas administradores podem adicionar usuários.' USING ERRCODE = '42501';
  END IF;
  IF _perfil NOT IN ('admin', 'user') THEN RAISE EXCEPTION 'Perfil inválido. Use admin ou user.'; END IF;
  IF _perfil = 'admin' AND NOT public.has_role(v_caller, 'master'::app_role) THEN
    RAISE EXCEPTION 'Apenas o Master pode criar administradores.' USING ERRCODE = '42501';
  END IF;
  IF public.is_master(v_caller) THEN v_sec := nullif(btrim(coalesce(_secretaria, '')), '');
  ELSE v_sec := public.my_org_label(); END IF;
  IF v_sec IS NULL THEN RAISE EXCEPTION 'Informe a secretaria/empresa do usuário.'; END IF;
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
    jsonb_build_object('nome', v_nome, 'secretaria', v_sec, 'must_change_password', true),
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true), now(), now(), now());

  UPDATE public.profiles SET aprovado = true, nome = v_nome, secretaria = v_sec WHERE id = v_id;
  DELETE FROM public.user_roles WHERE user_id = v_id AND role <> 'master';
  INSERT INTO public.user_roles (user_id, role) VALUES (v_id, _perfil::app_role) ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_log (user_id, user_email, acao, tabela, registro_id, detalhes)
  SELECT v_caller, (SELECT email FROM auth.users WHERE id = v_caller), 'criar_usuario', 'profiles', v_id,
         jsonb_build_object('email', v_email, 'perfil', _perfil, 'secretaria', v_sec);
  RETURN v_id;
END; $function$;

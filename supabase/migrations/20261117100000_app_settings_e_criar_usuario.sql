-- 1) Configurações do app editáveis só por admin/master (ex.: nome da seção "COLOG").
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Leitura pública apenas das chaves de identificação (a tela de login também mostra a seção).
DROP POLICY IF EXISTS "Read public settings" ON public.app_settings;
CREATE POLICY "Read public settings" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (key IN ('secao_nome'));
DROP POLICY IF EXISTS "Admin master insert settings" ON public.app_settings;
CREATE POLICY "Admin master insert settings" ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_master(auth.uid()));
DROP POLICY IF EXISTS "Admin master update settings" ON public.app_settings;
CREATE POLICY "Admin master update settings" ON public.app_settings
  FOR UPDATE TO authenticated USING (public.is_admin_or_master(auth.uid())) WITH CHECK (public.is_admin_or_master(auth.uid()));
DROP POLICY IF EXISTS "Admin master delete settings" ON public.app_settings;
CREATE POLICY "Admin master delete settings" ON public.app_settings
  FOR DELETE TO authenticated USING (public.is_admin_or_master(auth.uid()));

-- 2) Admin adiciona usuário já aprovado, escolhendo o perfil (admin ou usuário).
--    Quem cria admin precisa ser master. A conta nasce com senha provisória e
--    must_change_password=true (o app obriga a trocar no primeiro acesso).
CREATE OR REPLACE FUNCTION public.admin_criar_usuario(
  _email text, _nome text, _senha text, _perfil text, _secretaria text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_email text := lower(trim(coalesce(_email, '')));
  v_nome text := trim(coalesce(_nome, ''));
  v_id uuid := gen_random_uuid();
BEGIN
  IF v_caller IS NULL OR NOT public.is_admin_or_master(v_caller) THEN
    RAISE EXCEPTION 'Apenas administradores podem adicionar usuários.' USING ERRCODE = '42501';
  END IF;
  IF _perfil NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Perfil inválido. Use admin ou user.';
  END IF;
  IF _perfil = 'admin' AND NOT public.has_role(v_caller, 'master'::app_role) THEN
    RAISE EXCEPTION 'Apenas o Master pode criar administradores.' USING ERRCODE = '42501';
  END IF;
  IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'E-mail inválido.';
  END IF;
  IF length(v_nome) < 2 THEN
    RAISE EXCEPTION 'Informe o nome do usuário.';
  END IF;
  IF length(coalesce(_senha, '')) < 6 THEN
    RAISE EXCEPTION 'A senha provisória deve ter pelo menos 6 caracteres.';
  END IF;
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
    jsonb_build_object('nome', v_nome, 'secretaria', _secretaria, 'must_change_password', true),
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    now(), now(), now()
  );

  -- o trigger handle_new_user já criou profile e papel; ajusta aprovação e papel escolhido
  UPDATE public.profiles SET aprovado = true, nome = v_nome, secretaria = _secretaria WHERE id = v_id;
  DELETE FROM public.user_roles WHERE user_id = v_id AND role <> 'master';
  INSERT INTO public.user_roles (user_id, role) VALUES (v_id, _perfil::app_role) ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_log (user_id, user_email, acao, tabela, registro_id, detalhes)
  SELECT v_caller, (SELECT email FROM auth.users WHERE id = v_caller), 'criar_usuario', 'profiles', v_id,
         jsonb_build_object('email', v_email, 'perfil', _perfil);

  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.admin_criar_usuario(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_criar_usuario(text, text, text, text, text) TO authenticated;

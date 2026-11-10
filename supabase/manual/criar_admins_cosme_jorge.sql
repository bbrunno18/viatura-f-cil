-- Cria dois administradores com senha PROVISÓRIA (123456) e obriga a troca no primeiro acesso.
-- Rodar manualmente no SQL editor do banco (Lovable Cloud / Supabase). Idempotente.
-- O app (rota /trocar-senha) bloqueia o uso até a pessoa definir uma nova senha:
-- a trava é o campo raw_user_meta_data.must_change_password = true.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  r record;
  v_id uuid;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('cosme.marques@mj.gov.br', 'Cosme Marques'),
      ('jorge.silva@mj.gov.br',   'Jorge Silva')
    ) AS t(email, nome)
  LOOP
    SELECT id INTO v_id FROM auth.users WHERE lower(email) = r.email;

    IF v_id IS NULL THEN
      v_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        r.email, extensions.crypt('123456', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('nome', r.nome, 'must_change_password', true),
        now(), now(), '', '', '', ''
      );
      INSERT INTO auth.identities (
        id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_id, v_id::text, 'email',
        jsonb_build_object('sub', v_id::text, 'email', r.email, 'email_verified', true),
        now(), now(), now()
      );
    ELSE
      -- já existia: força nova troca de senha e mantém o cadastro
      UPDATE auth.users
         SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"must_change_password": true}'::jsonb,
             encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf')),
             updated_at = now()
       WHERE id = v_id;
    END IF;

    -- o trigger handle_new_user cria profile (aprovado=false) e papel 'user'; ajusta aqui
    INSERT INTO public.profiles (id, nome, email, aprovado)
    VALUES (v_id, r.nome, r.email, true)
    ON CONFLICT (id) DO UPDATE SET aprovado = true;

    DELETE FROM public.user_roles WHERE user_id = v_id AND role <> 'master';
    INSERT INTO public.user_roles (user_id, role) VALUES (v_id, 'admin')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

SELECT p.email, p.nome, p.aprovado, r.role
FROM public.profiles p JOIN public.user_roles r ON r.user_id = p.id
WHERE p.email IN ('cosme.marques@mj.gov.br', 'jorge.silva@mj.gov.br');

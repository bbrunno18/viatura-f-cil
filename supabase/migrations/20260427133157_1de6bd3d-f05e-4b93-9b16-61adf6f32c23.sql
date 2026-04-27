
CREATE OR REPLACE FUNCTION public.is_admin_or_master(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin'::app_role,'master'::app_role))
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND aprovado = true)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, secretaria, aprovado)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome',''), NEW.email, NEW.raw_user_meta_data->>'secretaria', false);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "Authenticated insert viaturas" ON public.viaturas;
CREATE POLICY "Admin master insert viaturas" ON public.viaturas FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Authenticated insert utilizacoes" ON public.utilizacoes;
CREATE POLICY "Approved insert utilizacoes" ON public.utilizacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = registrado_por AND public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated update own utilizacoes or admin" ON public.utilizacoes;
CREATE POLICY "Update utilizacoes own open or admin" ON public.utilizacoes FOR UPDATE TO authenticated
  USING (public.is_admin_or_master(auth.uid()) OR (auth.uid() = registrado_por AND data_retorno IS NULL));

DROP POLICY IF EXISTS "Authenticated insert abastecimentos" ON public.abastecimentos;
CREATE POLICY "Approved insert abastecimentos" ON public.abastecimentos FOR INSERT TO authenticated WITH CHECK (auth.uid() = registrado_por AND public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated update own abastecimentos or admin" ON public.abastecimentos;
CREATE POLICY "Admin master update abastecimentos" ON public.abastecimentos FOR UPDATE TO authenticated USING (public.is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Authenticated insert condutores" ON public.condutores;
CREATE POLICY "Approved insert condutores" ON public.condutores FOR INSERT TO authenticated WITH CHECK (public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admin master view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin_or_master(auth.uid()));
CREATE POLICY "Admin master update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Master manages roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'master'::app_role)) WITH CHECK (public.has_role(auth.uid(),'master'::app_role));

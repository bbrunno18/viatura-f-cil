
-- Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Viaturas
CREATE TABLE public.viaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo TEXT NOT NULL,
  cor TEXT NOT NULL,
  placa TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.viaturas ENABLE ROW LEVEL SECURITY;

-- Condutores
CREATE TABLE public.condutores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.condutores ENABLE ROW LEVEL SECURITY;

-- Utilizações
CREATE TABLE public.utilizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viatura_id UUID NOT NULL REFERENCES public.viaturas(id) ON DELETE RESTRICT,
  condutor_id UUID NOT NULL REFERENCES public.condutores(id) ON DELETE RESTRICT,
  data_saida TIMESTAMPTZ NOT NULL,
  km_inicial INTEGER NOT NULL,
  local_saida TEXT NOT NULL,
  data_retorno TIMESTAMPTZ,
  km_final INTEGER,
  local_estacionamento TEXT,
  latitude_estacionamento DOUBLE PRECISION,
  longitude_estacionamento DOUBLE PRECISION,
  registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.utilizacoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_utilizacoes_viatura ON public.utilizacoes(viatura_id);
CREATE INDEX idx_utilizacoes_aberta ON public.utilizacoes(viatura_id) WHERE data_retorno IS NULL;

-- Abastecimentos
CREATE TABLE public.abastecimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viatura_id UUID NOT NULL REFERENCES public.viaturas(id) ON DELETE RESTRICT,
  condutor_id UUID NOT NULL REFERENCES public.condutores(id) ON DELETE RESTRICT,
  data_abastecimento TIMESTAMPTZ NOT NULL,
  litros NUMERIC(10,2) NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,
  registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.abastecimentos ENABLE ROW LEVEL SECURITY;

-- Trigger profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- viaturas
CREATE POLICY "Authenticated view viaturas" ON public.viaturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert viaturas" ON public.viaturas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins update viaturas" ON public.viaturas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete viaturas" ON public.viaturas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- condutores
CREATE POLICY "Authenticated view condutores" ON public.condutores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert condutores" ON public.condutores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins update condutores" ON public.condutores FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete condutores" ON public.condutores FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- utilizacoes
CREATE POLICY "Authenticated view utilizacoes" ON public.utilizacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert utilizacoes" ON public.utilizacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = registrado_por);
CREATE POLICY "Authenticated update own utilizacoes or admin" ON public.utilizacoes FOR UPDATE TO authenticated USING (auth.uid() = registrado_por OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete utilizacoes" ON public.utilizacoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- abastecimentos
CREATE POLICY "Authenticated view abastecimentos" ON public.abastecimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert abastecimentos" ON public.abastecimentos FOR INSERT TO authenticated WITH CHECK (auth.uid() = registrado_por);
CREATE POLICY "Authenticated update own abastecimentos or admin" ON public.abastecimentos FOR UPDATE TO authenticated USING (auth.uid() = registrado_por OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete abastecimentos" ON public.abastecimentos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed das viaturas
INSERT INTO public.viaturas (modelo, cor) VALUES
  ('Mitsubishi L200 Triton Sport GLS', 'Preta'),
  ('Mitsubishi L200 Triton Sport GLS', 'Branca'),
  ('Citroën C4 Lounge', 'Preto'),
  ('Toyota Yaris', 'Branco');


ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'master';

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS aprovado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secretaria text;

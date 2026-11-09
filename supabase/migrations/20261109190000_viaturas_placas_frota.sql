-- Cadastro/vínculo das três viaturas da frota com suas placas.
-- Idempotente: pode ser executada mais de uma vez sem duplicar registros.
-- 1) Se já existir a viatura (mesmo modelo/cor) sem placa, apenas vincula a placa.
-- 2) Se ainda não existir nenhuma viatura com a placa, cria o registro.

-- Mitsubishi L200 Triton Sport GLSA 2021 - Preta (PBH-0A59)
UPDATE public.viaturas
SET placa = 'PBH-0A59', modelo = 'Mitsubishi L200 Triton Sport GLSA 2021'
WHERE placa IS NULL
  AND modelo ILIKE '%L200%'
  AND cor ILIKE 'preta%'
  AND NOT EXISTS (SELECT 1 FROM public.viaturas WHERE placa = 'PBH-0A59');

INSERT INTO public.viaturas (modelo, cor, placa)
SELECT 'Mitsubishi L200 Triton Sport GLSA 2021', 'Preta', 'PBH-0A59'
WHERE NOT EXISTS (SELECT 1 FROM public.viaturas WHERE placa = 'PBH-0A59');

-- Mitsubishi L200 Triton Sport GLS - Branca (PAL-9A97)
UPDATE public.viaturas
SET placa = 'PAL-9A97', modelo = 'Mitsubishi L200 Triton Sport GLS'
WHERE placa IS NULL
  AND modelo ILIKE '%L200%'
  AND cor ILIKE 'branca%'
  AND NOT EXISTS (SELECT 1 FROM public.viaturas WHERE placa = 'PAL-9A97');

INSERT INTO public.viaturas (modelo, cor, placa)
SELECT 'Mitsubishi L200 Triton Sport GLS', 'Branca', 'PAL-9A97'
WHERE NOT EXISTS (SELECT 1 FROM public.viaturas WHERE placa = 'PAL-9A97');

-- Toyota Yaris SA XS15 2024 - Branco (SSK-0C38)
UPDATE public.viaturas
SET placa = 'SSK-0C38', modelo = 'Toyota Yaris SA XS15 2024'
WHERE placa IS NULL
  AND modelo ILIKE '%yaris%'
  AND NOT EXISTS (SELECT 1 FROM public.viaturas WHERE placa = 'SSK-0C38');

INSERT INTO public.viaturas (modelo, cor, placa)
SELECT 'Toyota Yaris SA XS15 2024', 'Branco', 'SSK-0C38'
WHERE NOT EXISTS (SELECT 1 FROM public.viaturas WHERE placa = 'SSK-0C38');

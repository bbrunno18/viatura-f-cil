import { z } from "zod";

// Campos alinhados às colunas reais da tabela `viaturas`:
// modelo, cor, placa, km_atual (ativa/id/created_at são gerenciados pelo sistema).
export const viaturaSchema = z.object({
  modelo: z
    .string()
    .trim()
    .min(2, "Informe pelo menos 2 caracteres no modelo."),
  cor: z
    .string()
    .trim()
    .min(2, "Informe a cor da viatura."),
  placa: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/i, "Placa inválida. Use o formato ABC-1D23.")
    .optional()
    .or(z.literal("")),
  km_atual: z
    .coerce
    .number()
    .int("A quilometragem deve ser um número inteiro.")
    .min(0, "A quilometragem não pode ser negativa.")
    .nullable()
    .optional(),
});

export type ViaturaFormData = z.infer<typeof viaturaSchema>;

// Schema de edição (todos os campos opcionais)
export const viaturaEditSchema = viaturaSchema.partial();

export type ViaturaEditFormData = z.infer<typeof viaturaEditSchema>;

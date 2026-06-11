import { z } from "zod";

export const viaturaSchema = z.object({
  modelo: z
    .string()
    .min(2, "Informe pelo menos 2 caracteres no modelo."),
  cor: z
    .string()
    .min(2, "Informe a cor da viatura."),
  placa: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/i, "Placa inválida. Use o formato ABC-1D23.")
    .optional()
    .or(z.literal("")),
  endereco: z
    .string()
    .optional()
    .or(z.literal("")),
  latitude: z
    .coerce
    .number()
    .min(-90, "Latitude deve ser entre -90 e 90.")
    .max(90, "Latitude deve ser entre -90 e 90.")
    .nullable()
    .optional(),
  longitude: z
    .coerce
    .number()
    .min(-180, "Longitude deve ser entre -180 e 180.")
    .max(180, "Longitude deve ser entre -180 e 180.")
    .nullable()
    .optional(),
});

export type ViaturaFormData = z.infer<typeof viaturaSchema>;

// Schema de edição (todos os campos opcionais)
export const viaturaEditSchema = viaturaSchema.partial();

export type ViaturaEditFormData = z.infer<typeof viaturaEditSchema>;

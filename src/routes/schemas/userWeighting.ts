import { z } from "zod";

/**
 * Schema for individual weight entry used across user-calculate and preset endpoints.
 */
const weightEntrySchema = z.object({
  criteriaId: z.number().int().positive(),
  bobot: z.number().min(0).max(1),
});

/**
 * Request schema for POST /api/waspas/user-calculate.
 * Accepts optional inline weights, optional preset reference, and optional lambda.
 * Weights and presetId are mutually exclusive.
 */
export const userCalcSchema = z
  .object({
    weights: z.array(weightEntrySchema).optional(),
    presetId: z.number().int().positive().optional(),
    lambda: z.number().min(0, "Lambda harus antara 0 dan 1").max(1, "Lambda harus antara 0 dan 1").optional(),
  })
  .refine((data) => !(data.weights && data.presetId), {
    message: "Hanya boleh memilih satu sumber bobot: weights atau presetId",
  });

/**
 * Request schema for POST /api/presets (create a new weight preset).
 * Name: 1-100 chars, alphanumeric + spaces/hyphens/underscores only.
 * Description: optional, max 500 chars.
 * Weights: at least 1 entry required.
 */
export const presetCreateSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Nama hanya boleh berisi huruf, angka, spasi, dash, underscore"
    ),
  description: z.string().max(500).optional(),
  weights: z.array(weightEntrySchema).min(1),
});

/**
 * Request schema for PUT /api/presets/:id (update an existing preset).
 * All fields are optional — only provided fields will be updated.
 */
export const presetUpdateSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Nama hanya boleh berisi huruf, angka, spasi, dash, underscore"
    )
    .optional(),
  description: z.string().max(500).optional(),
  weights: z.array(weightEntrySchema).min(1).optional(),
});

export type UserCalcInput = z.infer<typeof userCalcSchema>;
export type PresetCreateInput = z.infer<typeof presetCreateSchema>;
export type PresetUpdateInput = z.infer<typeof presetUpdateSchema>;

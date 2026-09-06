import { z } from "zod";

const hexColor = /^#[0-9A-Fa-f]{6}$/;

export const createPresetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "名前は1文字以上で入力してください")
    .max(50, "名前は50文字以内で入力してください"),
  parentId: z.string().min(1).optional(),
  color: z.string().regex(hexColor, "色は#RRGGBB形式で指定してください").optional(),
});

export const updatePresetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "名前は1文字以上で入力してください")
    .max(50, "名前は50文字以内で入力してください")
    .optional(),
  parentId: z.string().min(1).nullable().optional(),
  color: z.string().regex(hexColor, "色は#RRGGBB形式で指定してください").optional(),
  order: z.number().int().optional(),
  archived: z.boolean().optional(),
});

export const startSessionSchema = z.object({
  presetId: z.string().min(1, "presetId は必須です"),
});

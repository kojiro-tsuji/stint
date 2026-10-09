import { z } from "zod";
import { isCalendarColor } from "@/lib/colors";

const calendarColor = z.string().refine(isCalendarColor, "色はGoogleカレンダーの11色から選んでください");

export const createPresetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "名前は1文字以上で入力してください")
    .max(50, "名前は50文字以内で入力してください"),
  parentId: z.string().min(1).optional(),
  color: calendarColor.optional(),
});

export const updatePresetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "名前は1文字以上で入力してください")
    .max(50, "名前は50文字以内で入力してください")
    .optional(),
  parentId: z.string().min(1).nullable().optional(),
  color: calendarColor.optional(),
  order: z.number().int().optional(),
  archived: z.boolean().optional(),
});

export const startSessionSchema = z.object({
  presetId: z.string().min(1, "presetId は必須です"),
});

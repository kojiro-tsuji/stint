/** Googleカレンダーの予定の色（11色）。colorId は Calendar API の events.colorId に対応する */
export const CALENDAR_COLORS = [
  { name: "トマト", hex: "#D50000", colorId: "11" },
  { name: "フラミンゴ", hex: "#E67C73", colorId: "4" },
  { name: "ミカン", hex: "#F4511E", colorId: "6" },
  { name: "バナナ", hex: "#F6BF26", colorId: "5" },
  { name: "セージ", hex: "#33B679", colorId: "2" },
  { name: "バジル", hex: "#0B8043", colorId: "10" },
  { name: "ピーコック", hex: "#039BE5", colorId: "7" },
  { name: "ブルーベリー", hex: "#3F51B5", colorId: "9" },
  { name: "ラベンダー", hex: "#7986CB", colorId: "1" },
  { name: "ブドウ", hex: "#8E24AA", colorId: "3" },
  { name: "グラファイト", hex: "#616161", colorId: "8" },
] as const;

/** Googleカレンダーの既定色（ピーコック） */
export const DEFAULT_COLOR = "#039BE5";

export function isCalendarColor(hex: string): boolean {
  return CALENDAR_COLORS.some((c) => c.hex.toLowerCase() === hex.toLowerCase());
}

/** 色コードを Calendar API の colorId に変換する。11色以外や未設定なら undefined（カレンダーの既定色になる） */
export function toCalendarColorId(hex: string | null): string | undefined {
  if (!hex) return undefined;
  return CALENDAR_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.colorId;
}

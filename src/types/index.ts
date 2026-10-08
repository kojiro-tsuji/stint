export const MAX_DEPTH = 2; // 0-indexed。最大3階層（0,1,2）
export const MIN_DURATION_SEC = 60; // これ未満は破棄
export const MAX_SESSION_HOURS = 24; // これを超えた計測は自動で終了し、終了時刻を開始+24時間に打ち切る
export const STALE_SESSION_HOURS = 20; // これ以上で「まもなく自動終了」の警告を出す

export type PresetNode = {
  id: string;
  name: string;
  depth: number;
  color: string | null;
  order: number;
  archived: boolean;
  children: PresetNode[];
};

export type ActiveSessionDTO = {
  id: string;
  title: string;
  color: string | null;
  startedAt: string; // ISO 8601
  endedAt: string | null; // null なら計測中、値があれば同期リトライ待ち
  syncAttempts: number;
  syncError: string | null;
};

/** 24時間を超えて自動終了したとき、そのことを知らせるために GET /api/session が一度だけ返す */
export type AutoEndedDTO = {
  title: string;
  result: "synced" | "sync_failed" | "reauth_required";
};

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "SESSION_ALREADY_ACTIVE"
  | "SYNC_PENDING"
  | "MAX_DEPTH_EXCEEDED"
  | "CIRCULAR_REFERENCE"
  | "REAUTH_REQUIRED"
  | "CALENDAR_ERROR"
  | "INTERNAL_ERROR";

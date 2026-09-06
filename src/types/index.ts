export const MAX_DEPTH = 2; // 0-indexed。最大3階層（0,1,2）
export const MIN_DURATION_SEC = 60; // これ未満は破棄
export const STALE_SESSION_HOURS = 24; // これ以上でUI警告

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

import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@/types";

const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  SESSION_ALREADY_ACTIVE: 409,
  SYNC_PENDING: 409,
  MAX_DEPTH_EXCEEDED: 400,
  CIRCULAR_REFERENCE: 400,
  REAUTH_REQUIRED: 403,
  CALENDAR_ERROR: 502,
  INTERNAL_ERROR: 500,
};

export class ApiException extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function apiErrorResponse(code: ApiErrorCode, message: string) {
  return NextResponse.json({ error: code, message }, { status: STATUS[code] });
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiException) {
    return apiErrorResponse(err.code, err.message);
  }
  console.error(err);
  return apiErrorResponse("INTERNAL_ERROR", "予期しないエラーが発生しました");
}

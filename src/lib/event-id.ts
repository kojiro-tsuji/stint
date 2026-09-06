import { randomBytes } from "crypto";

/**
 * Google Calendar の event.id として直接使える文字列を生成する。
 *
 * Google側の制約:
 * - 使用可能な文字は base32hex の文字種（小文字 a〜v と数字 0〜9）のみ
 * - 長さは 5〜1024 文字
 *
 * cuid や UUID はこの文字種を満たさない（w〜z やハイフンを含みうる）ため、
 * ActiveSession.id 兼 Calendar イベントIDとして専用の生成関数を使う。
 */
const ALPHABET = "0123456789abcdefghijklmnopqrstuv"; // 32文字

export function generateEventId(length = 26): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % 32];
  }
  return out;
}

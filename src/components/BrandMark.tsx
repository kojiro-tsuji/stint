/**
 * アプリアイコン（経過リング）。public/icons/ の PNG と同じ図形を SVG で描く。
 * 図形を変えるときは scripts/generate-icons.mjs も合わせて更新すること。
 */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 168 168" aria-hidden="true">
      <rect width="168" height="168" rx="38" fill="#2563eb" />
      <g transform="translate(32 32)" fill="none" strokeWidth="12">
        <circle cx="52" cy="52" r="40" stroke="rgba(255,255,255,0.3)" />
        <path d="M52 12a40 40 0 1 1-40 40" stroke="#ffffff" strokeLinecap="round" />
        <circle cx="52" cy="52" r="8" fill="#ffffff" stroke="none" />
      </g>
    </svg>
  );
}

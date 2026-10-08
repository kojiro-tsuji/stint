import type { NextConfig } from "next";

// Auth.js のコールバック先（AUTH_URL）と同じドメインに揃えないと、ログイン開始時に
// 発行される PKCE 用 Cookie がコールバック時に届かず InvalidCheck で失敗する。
// Vercel が自動で割り当てる別名ドメインへのアクセスは正式なドメインへ転送する。
const CANONICAL_ORIGIN = "https://stint-app-kojiro-tsujis-projects.vercel.app";
const ALIAS_HOSTS = ["stint-app-iota.vercel.app"];

const nextConfig: NextConfig = {
  async redirects() {
    return ALIAS_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `${CANONICAL_ORIGIN}/:path*`,
      permanent: false,
    }));
  },
};

export default nextConfig;

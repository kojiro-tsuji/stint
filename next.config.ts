import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prismaをバンドル対象から外し、そのままnode_modulesから読み込ませる。
  // 含めないと、サーバーレス関数内でクエリエンジンのバイナリを
  // 正しく解決できず実行時エラーになることがある。
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;

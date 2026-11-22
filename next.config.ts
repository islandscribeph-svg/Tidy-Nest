import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the database driver external so the Worker can use nodejs_compat sockets.
  serverExternalPackages: ["@prisma/client", "prisma", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;

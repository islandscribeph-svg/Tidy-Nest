import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the database driver external so the Worker can use nodejs_compat sockets.
  serverExternalPackages: ["@prisma/client", "prisma", "@prisma/adapter-pg", "pg"],
  // Dev-only route badge. Production builds omit it. Top-right keeps it off the phone bottom nav.
  devIndicators: {
    position: "top-right",
  },
};

export default nextConfig;

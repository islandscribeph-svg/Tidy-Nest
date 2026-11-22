import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  connectionKey?: string;
};

// One client per Worker request. A Pool kept from an earlier request can sit
// on a closed Hyperdrive socket and the next request waits forever.
const clientsByContext = new WeakMap<object, PrismaClient>();

function databaseUrl(): string {
  try {
    const { env } = getCloudflareContext();
    const hyperdrive = env.HYPERDRIVE?.connectionString;
    if (hyperdrive) return hyperdrive;
  } catch {
    // `next dev`, tests, and one-off scripts have no Worker request context.
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

export function createPrismaClient(connectionString: string): PrismaClient {
  const pool = new Pool({ connectionString, max: 1 });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

function createClient(): PrismaClient {
  const url = databaseUrl();
  try {
    const { ctx } = getCloudflareContext();
    const cached = clientsByContext.get(ctx);
    if (cached) return cached;
    const client = createPrismaClient(url);
    clientsByContext.set(ctx, client);
    return client;
  } catch {
    // Node dev, tests, and scripts.
  }
  if (globalForPrisma.prisma && globalForPrisma.connectionKey === url) return globalForPrisma.prisma;
  const client = createPrismaClient(url);
  globalForPrisma.prisma = client;
  globalForPrisma.connectionKey = url;
  return client;
}

// Lazy so importing this module does not open a database connection.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = createClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

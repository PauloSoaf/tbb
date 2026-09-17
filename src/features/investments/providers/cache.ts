import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function withMarketCache<T>(options: {
  key: string;
  provider: string;
  ttlMs: number;
  load: () => Promise<{ data: T; asOf: Date }>;
}): Promise<{ data: T; asOf: Date; retrievedAt: Date; stale: boolean }> {
  const now = new Date();
  const cached = await prisma.investmentMarketSnapshot.findUnique({ where: { key_provider: { key: options.key, provider: options.provider } } });
  if (cached && cached.expiresAt > now) return { data: cached.payload as T, asOf: cached.asOf, retrievedAt: cached.retrievedAt, stale: false };

  try {
    const loaded = await options.load();
    const saved = await prisma.investmentMarketSnapshot.upsert({
      where: { key_provider: { key: options.key, provider: options.provider } },
      create: { key: options.key, provider: options.provider, payload: loaded.data as Prisma.InputJsonValue, asOf: loaded.asOf, retrievedAt: now, expiresAt: new Date(now.getTime() + options.ttlMs), status: "FRESH" },
      update: { payload: loaded.data as Prisma.InputJsonValue, asOf: loaded.asOf, retrievedAt: now, expiresAt: new Date(now.getTime() + options.ttlMs), status: "FRESH" },
    });
    return { data: loaded.data, asOf: saved.asOf, retrievedAt: saved.retrievedAt, stale: false };
  } catch (error) {
    if (cached) {
      await prisma.investmentMarketSnapshot.update({ where: { id: cached.id }, data: { status: "STALE" } }).catch(() => undefined);
      return { data: cached.payload as T, asOf: cached.asOf, retrievedAt: cached.retrievedAt, stale: true };
    }
    throw error;
  }
}

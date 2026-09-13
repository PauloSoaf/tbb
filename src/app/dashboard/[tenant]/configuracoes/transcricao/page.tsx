import { TranscriptionSettingsPageClient } from "@/components/transcriptions/TranscriptionSettingsPageClient";
import { getTenantSubscriptionContext } from "@/lib/billing/subscription-context";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenancy/requirePermission";
import {
  getTranscriptionProviderStatus,
  getTranscriptionSettings,
} from "@/services/transcription/transcription-session.service";

interface PageProps {
  params: Promise<{ tenant: string }>;
}

export default async function TranscriptionSettingsPage({ params }: PageProps) {
  const { tenant } = await params;
  const ctx = await requirePermission("transcription.settings", "view", tenant);
  const settings = await getTranscriptionSettings(ctx.nutritionistId);
  const [providerStatus, usage, subscription] = await Promise.all([
    getTranscriptionProviderStatus(settings),
    prisma.transcriptionUsageCounter.aggregate({
      where: {
        tenantId: ctx.nutritionistId,
        yearMonth: new Date().toISOString().slice(0, 7),
      },
      _sum: { minutesTranscribed: true },
    }),
    getTenantSubscriptionContext(ctx.nutritionistId),
  ]);

  return (
    <TranscriptionSettingsPageClient
      tenantSlug={tenant}
      canEdit={
        ctx.isOwner ||
        ctx.permissions.has("transcription.settings.edit")
      }
      initialSettings={JSON.parse(JSON.stringify(settings))}
      initialProviderStatus={providerStatus}
      usage={{
        currentMinutes: usage._sum.minutesTranscribed ?? 0,
        limitMinutes:
          subscription.featureLimits["transcription.minutes.monthly"]?.limit ??
          null,
      }}
    />
  );
}

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { extractShortIdFromSlug } from "@/lib/utils/patientSlug";
import { notFound } from "next/navigation";
export {
  getPatientAnamnesisHref,
  getPatientAppointmentsHref,
  getPatientChatHref,
  getPatientEditHref,
  getPatientEvaluationsHref,
  getPatientFilesHref,
  getPatientHref,
  getPatientMealPlansHref,
  getPatientMeasurementsHref,
} from "@/lib/utils/patientRoute";

// React.cache: page + generateMetadata + nested components share one lookup
// per request instead of each paying a DB round-trip.
export const resolvePatientIdFromRouteParam = cache(
  async (nutritionistId: string, param: string): Promise<string> => {
    // Patient ids are cuids (no dashes). Slugs always contain dashes
    // (name-shortid), so the exact-id lookup would ALWAYS miss for them —
    // skipping it saves a wasted DB round-trip on every patient navigation.
    const mayBeRawId = !param.includes("-");

    if (mayBeRawId) {
      const patient = await prisma.patient.findFirst({
        where: { id: param, nutritionistId },
        select: { id: true },
      });
      if (patient) return patient.id;
    }

    // Extract shortId from the slug and find by endsWith
    const shortId = extractShortIdFromSlug(param);
    if (shortId) {
      const patient = await prisma.patient.findFirst({
        where: {
          nutritionistId,
          id: { endsWith: shortId },
        },
        select: { id: true },
      });

      if (patient) return patient.id;
    }

    notFound();
  }
);

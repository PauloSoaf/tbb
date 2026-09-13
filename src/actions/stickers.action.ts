"use server";

import { prisma as db } from "@/lib/prisma";

export async function getCustomStickersAction(tenantSlug: string) {
  try {
    const nutritionist = await db.nutritionist.findFirst({
      where: { slug: tenantSlug },
    });

    if (!nutritionist) {
      throw new Error("Nutritionist not found");
    }

    const stickers = await db.customSticker.findMany({
      where: { nutritionistId: nutritionist.id },
      orderBy: { createdAt: "desc" },
    });

    return { stickers };
  } catch (error) {
    console.error("Error fetching custom stickers:", error);
    return { error: "Failed to fetch custom stickers" };
  }
}

export async function addCustomStickerAction(tenantSlug: string, imageUrl: string) {
  try {
    const nutritionist = await db.nutritionist.findFirst({
      where: { slug: tenantSlug },
    });

    if (!nutritionist) {
      throw new Error("Nutritionist not found");
    }

    const sticker = await db.customSticker.create({
      data: {
        nutritionistId: nutritionist.id,
        imageUrl,
      },
    });

    return { sticker };
  } catch (error) {
    console.error("Error adding custom sticker:", error);
    return { error: "Failed to add custom sticker" };
  }
}

export async function deleteCustomStickerAction(tenantSlug: string, stickerId: string) {
  try {
    const nutritionist = await db.nutritionist.findFirst({
      where: { slug: tenantSlug },
    });

    if (!nutritionist) {
      throw new Error("Nutritionist not found");
    }

    await db.customSticker.delete({
      where: { 
        id: stickerId,
        nutritionistId: nutritionist.id 
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting custom sticker:", error);
    return { error: "Failed to delete custom sticker" };
  }
}

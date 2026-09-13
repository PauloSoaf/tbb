import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create nutritionist Teste
  const nutritionist = await prisma.nutritionist.upsert({
    where: { slug: "teste" },
    update: {},
    create: {
      slug: "teste",
      name: "Nutricionista Teste",
      crn: "CRN-7 00000",
      bio: "Nutricionista com foco em emagrecimento saudável, saúde intestinal e saúde da mulher. Atendimento humanizado e personalizado para ajudar você a alcançar seus objetivos de saúde.",
      whatsapp: "5592999999999",
      email: "teste@nutriopus.com",
      clinicAddress: "Av. Eduardo Ribeiro, 520 - Centro",
      city: "Manaus",
      state: "AM",
      profileImageUrl: null,
      themePrimaryColor: "#2563EB",
      specialties: [
        "Emagrecimento",
        "Saúde intestinal",
        "Saúde da mulher",
        "Reeducação alimentar",
      ],
    },
  });

  console.log(`✅ Nutritionist created: ${nutritionist.name} (${nutritionist.slug})`);

  // Create user for login
  const passwordHash = await bcrypt.hash("123456", 10);
  const user = await prisma.user.upsert({
    where: { email: "teste@nutriopus.com" },
    update: {},
    create: {
      nutritionistId: nutritionist.id,
      name: "Nutricionista Teste",
      email: "teste@nutriopus.com",
      passwordHash,
      role: "NUTRITIONIST",
    },
  });

  console.log(`✅ User created: ${user.email}`);
  console.log("🎉 Seed completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

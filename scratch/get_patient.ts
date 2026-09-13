import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const patients = await prisma.patient.findMany({
    where: {
      name: {
        contains: 'paulo amorim',
        mode: 'insensitive'
      }
    }
  });

  if (patients.length === 0) {
    console.log("Paciente não encontrado.");
    return;
  }

  for (const p of patients) {
    console.log(`Paciente: ${p.name}`);
    console.log(`Email: ${p.email}`);
    
    // Check if patientAccount exists
    const account = await prisma.patientAccount.findUnique({
      where: { patientId: p.id }
    });

    if (account) {
      console.log(`Senha: [Protegida por Hash]. Vamos definir a senha temporária para '123456'`);
      const newHash = await bcrypt.hash('123456', 10);
      await prisma.patientAccount.update({
        where: { id: account.id },
        data: { passwordHash: newHash }
      });
      console.log(`Nova senha definida com sucesso: 123456`);
    } else {
      console.log(`Senha: O paciente ainda não tem senha/acesso criado.`);
      
      const newHash = await bcrypt.hash('123456', 10);
      await prisma.patientAccount.create({
        data: { 
          patient: { connect: { id: p.id } },
          nutritionist: { connect: { id: p.nutritionistId } },
          email: p.email || '',
          passwordHash: newHash,
          status: 'ACTIVE',
          activatedAt: new Date()
        }
      });
      console.log(`Conta gerada e senha definida para o paciente: 123456`);
    }
    
    // Find nutritionist slug to give the full URL
    const nutritionist = await prisma.nutritionist.findUnique({
      where: { id: p.nutritionistId }
    });
    
    if (nutritionist) {
      console.log(`URL do Portal: http://localhost:3000/portal/${nutritionist.slug}/login`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

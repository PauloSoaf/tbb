# NutriOpus — Cache Policy

**Data:** 2026-06-29

---

## O que PODE ser cacheado

### Dados públicos e não-sensíveis
- Configurações globais do sistema (que mudam raramente)
- Listas de alimentos TACO (tabela nutricional pública)
- Templates de plano alimentar padrão

### Exemplo com `unstable_cache`
```typescript
import { unstable_cache } from "next/cache";

export const getTacoFoods = unstable_cache(
  async () => db.tacoFood.findMany(),
  ["taco-foods"],
  { revalidate: 3600 } // 1 hora
);
```

---

## O que NUNCA deve ser cacheado

### Dados clínicos e sensíveis (LGPD)
- Prontuários de pacientes
- Anamneses, medidas antropométricas
- Planos alimentares individualizados
- Histórico de consultas
- Dados de peso e evolução clínica
- Mensagens do chat nutricionista↔paciente
- Dados do portal do paciente

### Dados por tenant
- Qualquer query filtrada por `nutritionistId` ou `tenant`
- Agendamentos e atendimentos

**Motivo:** Dados cacheados podem vazar entre requests de tenants diferentes em ambientes serverless com warm lambdas.

---

## Revalidação após mutações

Use as funções de `src/lib/revalidation/revalidate-nutriopus.ts` em Server Actions após mutações:

```typescript
import { revalidatePatientList, revalidateDashboard } from "@/lib/revalidation/revalidate-nutriopus";

export async function createPatientAction(data: PatientData) {
  const tenant = await getTenant();
  await db.patient.create({ data });
  revalidatePatientList(tenant);
  revalidateDashboard(tenant); // stats de pacientes no dashboard
}
```

### Funções disponíveis
| Função | Revalida |
|--------|---------|
| `revalidateDashboard(tenant)` | `/dashboard/[tenant]` |
| `revalidatePatientList(tenant)` | `/dashboard/[tenant]/pacientes` |
| `revalidatePatientRecord(tenant, patientId)` | `/dashboard/[tenant]/pacientes/[patientId]` |
| `revalidatePortalHome(tenant)` | `/portal/[tenant]` |
| `revalidatePortalMealPlan(tenant)` | `/portal/[tenant]/cardapio` |
| `revalidateAgenda(tenant)` | `/dashboard/[tenant]/agenda` |
| `revalidateCareSessions(tenant)` | `/dashboard/[tenant]/atendimentos` |

---

## Next.js fetch cache (estendido)

O Next.js estende o `fetch` nativo com cache automático. Para desabilitar:

```typescript
// Desabilitar cache (dados sempre frescos)
const res = await fetch(url, { cache: "no-store" });

// Revalidar a cada N segundos
const res = await fetch(url, { next: { revalidate: 60 } });
```

Para Prisma (não usa `fetch`): não há cache automático. Os dados são sempre frescos. Adicione `unstable_cache` somente onde o custo da query for alto e os dados não forem sensíveis.

---

## Regra geral NutriOpus

**Se em dúvida: não cachear.** O custo de uma query a mais é menor que o risco de vazar dados clínicos ou mostrar dados desatualizados em contexto de saúde.

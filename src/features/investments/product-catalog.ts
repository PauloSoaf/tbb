import { prisma } from "@/lib/prisma";

const NUBANK_SOURCE = "https://nubank.com.br/nu/caixinhas";

export async function ensureDefaultInvestmentProducts() {
  const verifiedAt = new Date("2026-09-15T00:00:00.000Z");
  const validFrom = new Date("2026-09-15T00:00:00.000Z");
  await prisma.investmentProductDefinition.createMany({
    data: [
      { institution: "Nubank", product: "Caixinha", assetType: "CASH_EQUIVALENT", indexer: "CDI_PERCENTAGE", indexerPercentageBasisPoints: 10_000, eligibility: "Produto configurável. Confirme no aplicativo as condições da aplicação.", liquidity: "D0", validFrom, source: NUBANK_SOURCE, lastVerifiedAt: verifiedAt },
      { institution: "Nubank", product: "Caixinha Turbo 115", assetType: "CASH_EQUIVALENT", indexer: "CDI_PERCENTAGE", indexerPercentageBasisPoints: 11_500, eligibility: "Condição publicada: movimentar R$ 900 na Conta do Nu a cada ciclo de 31 dias. Confirme elegibilidade e limite no aplicativo.", eligibleLimitCents: 500_000, liquidity: "D0", validFrom, source: NUBANK_SOURCE, lastVerifiedAt: verifiedAt },
      { institution: "Nubank", product: "Caixinha Turbo 120", assetType: "CASH_EQUIVALENT", indexer: "CDI_PERCENTAGE", indexerPercentageBasisPoints: 12_000, eligibility: "Condição publicada para categorias elegíveis. Confirme elegibilidade e limite no aplicativo.", eligibleLimitCents: 1_000_000, liquidity: "D0", validFrom, source: NUBANK_SOURCE, lastVerifiedAt: verifiedAt },
    ],
    skipDuplicates: true,
  });
}

import { InvestmentCsvImport } from "@/features/investments/InvestmentCsvImport";
import { InvestmentSubnav } from "@/features/investments/InvestmentSubnav";
import { PageHeader } from "@/components/ui/PageHeader";
import { investmentShellData } from "@/features/investments/queries";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function InvestmentImportPage() {
  const context = await getWorkspaceContext();
  const shell = await investmentShellData(context.workspaceId);
  return <div className="investment-page"><PageHeader eyebrow="MONEY · INVESTMENTS" title="Importar carteira" description="Aceite formatos comuns, revise a prévia e preserve a origem de cada operação."/><InvestmentSubnav/><InvestmentCsvImport accounts={shell.accounts}/></div>;
}

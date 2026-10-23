import { money } from "./money";

export type ReadOnlyTransaction = {
  id: string; date: string; description: string; type: string; amountCents: number;
  accountId: string; destinationAccountId?: string | null; notes?: string | null;
  originLabel?: string;
};
export function ReadOnlyTransactions({ rows, accounts, title = "Lançamentos · somente leitura" }: {
  rows: ReadOnlyTransaction[]; accounts: { id: string; name: string }[]; title?: string;
}) {
  const names = new Map(accounts.map(account => [account.id, account.name]));
  return <section className="panel stack"><h2>{title}</h2>
    <div className="table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Conta</th><th>Tipo</th><th>Valor</th><th>Origem</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id} data-transaction-id={row.id}>
        <td>{row.date}</td><td>{row.description}{row.notes && <small className="block muted">{row.notes}</small>}</td>
        <td>{names.get(row.accountId) || "Conta arquivada"}{row.destinationAccountId && <> → {names.get(row.destinationAccountId) || "Conta arquivada"}</>}</td>
        <td>{row.type === "TRANSFER" ? "Transferência" : row.type === "EXPENSE" ? "Despesa" : row.type === "INCOME" ? "Receita" : row.type === "REFUND" ? "Reembolso" : "Ajuste"}</td><td>{money(row.amountCents)}</td><td>{row.originLabel ?? "Manual"}</td>
      </tr>)}</tbody></table></div>{!rows.length && <p className="muted">Nenhum lançamento encontrado.</p>}
  </section>;
}

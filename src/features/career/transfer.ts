import { CareerError } from "./service";
export function parseCareerCsv(source: string): Record<string, string>[] {
  if (source.length > 2_000_000)
    throw new CareerError("Limite de 2 MB por lote.");
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false;
  const input = source.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        value += '"';
        i++;
      } else if (quoted) quoted = false;
      else if (value === "") quoted = true;
      else throw new CareerError("CSV inválido: aspas fora de um campo.");
    } else if (c === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (quoted) throw new CareerError("CSV inválido: um campo não foi fechado.");
  row.push(value);
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2)
    throw new CareerError("O CSV precisa de cabeçalho e pelo menos uma vaga.");
  const headers = rows.shift()!;
  if (!headers.includes("companyName") || !headers.includes("jobTitle"))
    throw new CareerError(
      "Use o modelo exportado: companyName e jobTitle são obrigatórios.",
    );
  if (new Set(headers).size !== headers.length)
    throw new CareerError("O CSV repete uma coluna.");
  if (rows.length > 100)
    throw new CareerError("Importe até 100 vagas por lote.");
  return rows.map((r, index) => {
    if (r.length !== headers.length)
      throw new CareerError(
        `Linha ${index + 2}: quantidade de colunas incorreta.`,
      );
    return Object.fromEntries(headers.map((h, i) => [h, r[i]]));
  });
}
export const careerCsvColumns = [
  "id",
  "companyName",
  "jobTitle",
  "url",
  "careersUrl",
  "technologies",
  "seniority",
  "location",
  "workMode",
  "source",
  "salaryMinCents",
  "salaryMaxCents",
  "foundOn",
  "appliedOn",
  "status",
  "response",
  "nextAction",
  "nextActionDate",
  "deadline",
  "lastContactOn",
  "tags",
  "notes",
  "requirements",
  "coverLetter",
];
export function careerCsv(rows: Record<string, unknown>[]) {
  const cell = (v: unknown) => {
    let text = String(v ?? "");
    if (/^[\s]*[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      careerCsvColumns,
      ...rows.map((row) =>
        careerCsvColumns.map((c) =>
          Array.isArray(row[c]) ? (row[c] as string[]).join(", ") : row[c],
        ),
      ),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}

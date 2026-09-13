export function getPageLabel(pathname: string): string {
  if (pathname.includes("/pacientes/") && pathname.includes("/planos")) return "Planos alimentares";
  if (pathname.includes("/pacientes/") && (pathname.includes("/medidas") || pathname.includes("/avaliacoes"))) return "AvaliaÃ§Ãµes";
  if (pathname.includes("/pacientes/") && pathname.includes("/relatorio")) return "Relatório";
  if (pathname.includes("/pacientes/") && pathname.includes("/diario")) return "Diário alimentar";
  if (pathname.includes("/pacientes/") && pathname.includes("/chat")) return "Chat";
  if (pathname.includes("/pacientes/") && pathname.includes("/anamnese")) return "Anamneses";
  if (pathname.includes("/pacientes/") && pathname.includes("/consultas")) return "Histórico de consultas";
  if (pathname.includes("/pacientes/") && pathname.includes("/ficha")) return "Ficha clínica";
  if (pathname.includes("/pacientes/")) return "Prontuário";
  if (pathname.includes("/ferramentas/taco")) return "Tabela TACO";
  if (pathname.includes("/ferramentas/calculadoras")) return "Calculadoras";
  if (pathname.includes("/ferramentas/relatorio-clinica")) return "Relatório da Clínica";
  if (pathname.includes("/ferramentas/oficina-planos")) return "Oficina de Planos";
  if (pathname.includes("/ferramentas/bem-estar")) return "Painel de Bem-estar";
  if (pathname.includes("/ferramentas")) return "Ferramentas";
  if (pathname.includes("/agenda")) return "Agenda";
  if (pathname.includes("/atendimentos")) return "Atendimentos";
  if (pathname.includes("/equipe")) return "Equipe";
  if (pathname.includes("/config")) return "Configurações";
  return "Dashboard";
}

import fs from 'fs';
const files = [
  'src/actions/createPatient.action.ts',
  'src/actions/template.action.ts',
  'src/app/dashboard/[tenant]/agenda/page.tsx',
  'src/app/dashboard/[tenant]/ferramentas/bem-estar/page.tsx',
  'src/app/dashboard/[tenant]/ferramentas/relatorio-clinica/page.tsx',
  'src/app/dashboard/[tenant]/page.tsx',
  'src/components/appointments/CalendarMonthView.tsx',
  'src/components/dashboard/AppointmentDashboardItem.tsx',
  'src/components/dashboard/UnreadMessagesPanel.tsx',
  'src/components/patients/PatientMobileCard.tsx',
  'src/components/patients/PatientTable.tsx',
  'src/components/patients/timeline/PatientStickyHeader.tsx'
];
files.forEach(f => {
  const p = 'C:/Projetos/tcc/NutriOpus/' + f;
  let content = fs.readFileSync(p, 'utf8');
  if (!content.includes('getPatientHref')) return;
  if (!content.includes('patient-route.service')) {
    content = 'import { getPatientHref } from "@/services/patient-route.service";\n' + content;
    fs.writeFileSync(p, content, 'utf8');
    console.log('Fixed', f);
  }
});

import fs from 'fs';
import path from 'path';

const basePath = 'C:\\Projetos\\tcc\\NutriOpus\\src\\app\\dashboard\\[tenant]\\pacientes';
const currentDir = path.join(basePath, '[patientId]');

function processDirectory(dir: string) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file === 'page.tsx' || file === 'MealPlanClientView.tsx') {
      let content = fs.readFileSync(fullPath, 'utf8');

      let modified = false;

      // Add import if not exists
      if (!content.includes('resolvePatientIdFromRouteParam') && !content.includes('not-found')) {
        content = 'import { resolvePatientIdFromRouteParam } from "@/services/patient-route.service";\n' + content;
        modified = true;
      }

      // We ONLY want to replace the `params` destructuring if it hasn't been done yet.
      if (!content.includes('patientId = await resolvePatientIdFromRouteParam')) {
        // Find: const { tenant, patientId } = await params;
        const paramRegex = /(const\s+\{\s*tenant\s*,\s*)patientId(\s*\}\s*=\s*await\s+params;)/;
        if (paramRegex.test(content)) {
          content = content.replace(paramRegex, `$1patientId: patientSlug$2`);
          
          const sessionRegex = /(const\s+\{\s*session\s*\}\s*=\s*await\s+assertTenantAccess\([^)]+\);)/;
          if (sessionRegex.test(content)) {
            content = content.replace(sessionRegex, `$1\n  const patientId = await resolvePatientIdFromRouteParam(session.nutritionistId, patientSlug);`);
          } else {
             // Fallback
             content = content.replace(/(const\s+\{.*patientSlug.*\}\s*=\s*await\s+params;)/, `$1\n  // TODO: find session\n  const patientId = await resolvePatientIdFromRouteParam('MISSING', patientSlug);`);
          }
          modified = true;
        } else {
            // Might be: const { patientId, tenant } = await params;
            const paramRegex2 = /(const\s+\{\s*)patientId(\s*,\s*tenant\s*\}\s*=\s*await\s+params;)/;
            if (paramRegex2.test(content)) {
                content = content.replace(paramRegex2, `$1patientId: patientSlug$2`);
                
                const sessionRegex = /(const\s+\{\s*session\s*\}\s*=\s*await\s+assertTenantAccess\([^)]+\);)/;
                if (sessionRegex.test(content)) {
                  content = content.replace(sessionRegex, `$1\n  const patientId = await resolvePatientIdFromRouteParam(session.nutritionistId, patientSlug);`);
                }
                modified = true;
            }
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Processed', fullPath);
      }
    }
  }
}

processDirectory(currentDir);

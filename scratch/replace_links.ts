import fs from 'fs';
import path from 'path';

const srcDir = 'C:\\Projetos\\tcc\\NutriOpus\\src';

function processDirectory(dir: string) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      let modified = false;

      // 1. Exact match with #hash
      const regex1hash = /`\/dashboard\/\$\{(tenant(?:Slug)?)\}\/pacientes\/\$\{([a-zA-Z0-9_.]+)\.id\}#([^`]+)`/g;
      if (regex1hash.test(content)) {
        content = content.replace(regex1hash, (match, tenantVar, patientVar, hashVar) => {
          return `getPatientHref({ tenant: ${tenantVar}, patient: ${patientVar}, hash: "${hashVar}" })`;
        });
        modified = true;
      }

      // 2. /dashboard/${tenant}/pacientes/${patient.id}/algumacoisa
      const regex2 = /`\/dashboard\/\$\{(tenant(?:Slug)?)\}\/pacientes\/\$\{([a-zA-Z0-9_.]+)\.id\}\/([^#`]+)`/g;
      if (regex2.test(content)) {
        content = content.replace(regex2, (match, tenantVar, patientVar, suffix) => {
          return `getPatientHref({ tenant: ${tenantVar}, patient: ${patientVar}, suffix: "${suffix}" })`;
        });
        modified = true;
      }

      // 3. /dashboard/${tenant}/pacientes/${patient.id}
      const regex1 = /`\/dashboard\/\$\{(tenant(?:Slug)?)\}\/pacientes\/\$\{([a-zA-Z0-9_.]+)\.id\}`/g;
      if (regex1.test(content)) {
        content = content.replace(regex1, (match, tenantVar, patientVar) => {
          return `getPatientHref({ tenant: ${tenantVar}, patient: ${patientVar} })`;
        });
        modified = true;
      }

      if (modified) {
        if (!content.includes('getPatientHref')) {
          content = 'import { getPatientHref } from "@/services/patient-route.service";\n' + content;
        }
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Processed', fullPath);
      }
    }
  }
}

processDirectory(srcDir);

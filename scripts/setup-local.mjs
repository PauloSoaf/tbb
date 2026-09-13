import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
if (existsSync('.env')) { console.log('.env já existe; configuração preservada.'); process.exit(0); }
const password = randomBytes(24).toString('hex');
const database = `postgresql://tbb:${password}@localhost:5440/tbb?schema=public`;
writeFileSync('.env', `DATABASE_URL="${database}"\nDIRECT_URL="${database}"\nTBB_DB_PASSWORD="${password}"\nJWT_SECRET="${randomBytes(48).toString('hex')}"\nNEXT_PUBLIC_APP_URL="http://localhost:3000"\nSTORAGE_PROVIDER="local"\n`,{mode:0o600,flag:'wx'});
console.log('Ambiente local TBB criado com segredos independentes.');

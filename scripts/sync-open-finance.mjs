import env from '@next/env';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

/** Scheduler result, containing no identifiers, provider bodies or financial values. */
export async function scheduledOpenFinanceSync({ request = fetch, secret = process.env.OPEN_FINANCE_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim(), now = () => new Date(), timeoutMs = 300000 } = {}) {
  const report = { attemptedAt: now().toISOString(), succeeded: false };
  try {
    if (!secret || secret.length < 24) { report.errorCode = 'CRON_NOT_CONFIGURED'; return report; }
    const response = await request('http://127.0.0.1:3000/api/open-finance/cron', { method: 'POST', headers: { Authorization: `Bearer ${secret}` }, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
    report.httpStatus = response.status;
    const body = await response.json().catch(() => null);
    if (!body || !Array.isArray(body.results)) { report.errorCode = response.ok ? 'UNEXPECTED_RESPONSE' : `HTTP_${response.status}`; return report; }
    const valid = body.results.every(result => result && typeof result.status === 'string');
    const complete = valid && body.results.every(result => ['SUCCESS', 'PAUSED', 'BUSY'].includes(result.status));
    report.succeeded = response.ok && complete;
    if (!report.succeeded) {
      const allowed = ['NETWORK_TIMEOUT', 'NETWORK_ERROR', 'DNS_ERROR', 'TLS_ERROR', 'PROVIDER_UNAVAILABLE', 'RATE_LIMITED', 'INVALID_CREDENTIALS', 'UNAUTHORIZED', 'RECONNECT_REQUIRED', 'CONSENT_EXPIRED'];
      const cause = valid ? body.results.find(result => allowed.includes(result.errorCode))?.errorCode : null;
      report.errorCode = !valid ? 'UNEXPECTED_RESPONSE' : response.status === 207 ? 'PARTIAL_SYNC' : cause ?? (response.ok ? 'SYNC_FAILED' : `HTTP_${response.status}`);
    }
  } catch (error) {
    const rawCode = error?.cause?.code ?? error?.code;
    report.errorCode = error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'LOCAL_APP_TIMEOUT' : ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND'].includes(rawCode) ? rawCode : 'SYNC_UNAVAILABLE';
  }
  return report;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  env.loadEnvConfig(root);
  const report = await scheduledOpenFinanceSync();
  mkdirSync(resolve(root, '.data'), { recursive: true });
  writeFileSync(resolve(root, '.data/pluggy-last-scheduled-sync.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  process.exitCode = report.succeeded ? 0 : 1;
}

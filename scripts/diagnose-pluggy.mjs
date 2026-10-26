import { lookup } from 'node:dns/promises';
import tls from 'node:tls';

// No environment files, credentials, Item IDs, Prisma or bank endpoints are read.
const host = 'api.pluggy.ai';
const checks = [];
try {
  const addresses = await lookup(host, { all: true });
  checks.push({ step: 'DNS', ok: addresses.length > 0, ipv4: addresses.some(row => row.family === 4), ipv6: addresses.some(row => row.family === 6) });
} catch { checks.push({ step: 'DNS', ok: false }); }
if (checks[0].ok) {
  checks.push(await new Promise(resolve => {
    const socket = tls.connect({ host, servername: host, port: 443, rejectUnauthorized: true });
    const timer = setTimeout(() => socket.destroy(Object.assign(new Error(), { code: 'TIMEOUT' })), 10000);
    socket.once('secureConnect', () => { clearTimeout(timer); resolve({ step: 'TLS', ok: true, certificateValid: socket.authorized }); socket.destroy(); });
    socket.once('error', error => { clearTimeout(timer); resolve({ step: 'TLS', ok: false, reason: error.code === 'TIMEOUT' ? 'TIMEOUT' : 'SECURE_CONNECTION_FAILED' }); });
  }));
}
if (checks.some(row => row.step === 'TLS' && row.ok)) {
  try {
    const response = await fetch(`https://${host}/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', redirect: 'error', signal: AbortSignal.timeout(10000) });
    await response.body?.cancel();
    checks.push({ step: 'HTTP', ok: true, status: response.status });
  } catch { checks.push({ step: 'HTTP', ok: false }); }
}
const reachable = checks.some(row => row.step === 'HTTP' && row.ok);
console.log(JSON.stringify({ host, credentialsUsed: false, bankDataRead: false, checks, reachable }, null, 2));
process.exitCode = reachable ? 0 : 1;

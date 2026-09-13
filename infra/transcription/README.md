# NutriOpus realtime transcription infrastructure

This directory runs a dedicated, self-hosted transcription plane:

```text
NutriOpus browser
  -> WSS gateway (ephemeral HMAC token, origin/rate/size limits)
  -> Speaches (private Docker network, server-side API key)
  -> faster-whisper model cache
```

The browser never receives `SPEACHES_API_KEY` and cannot reach the Speaches
container directly. The only published service is the gateway. Speaches uses the
official OpenAI-compatible realtime path `/v1/realtime` with
`intent=transcription`.

## Quick start

Requirements:

- Docker Engine and Docker Compose v2.
- Approximately 4 GB of free disk for images and both model caches.
- NVIDIA Container Toolkit when using the GPU profile.

Create the local environment file and replace both secrets:

```powershell
Set-Location infra/transcription
Copy-Item .env.example .env
```

Generate independent random values with OpenSSL:

```bash
openssl rand -base64 48
openssl rand -base64 48
```

CPU:

```bash
docker compose -f docker-compose.transcription.yml --profile cpu up -d --build
docker compose -f docker-compose.transcription.yml --profile cpu ps
```

NVIDIA GPU:

```bash
docker run --rm --gpus all nvidia/cuda:12.6.3-base-ubuntu24.04 nvidia-smi
docker compose -f docker-compose.transcription.yml --profile gpu up -d --build
docker compose -f docker-compose.transcription.yml --profile gpu ps
```

Set only one profile per command. Keep `COMPOSE_PROFILES` empty when using the
explicit `--profile` commands above. Initial startup can take several minutes
because Speaches downloads the default and fallback models before its healthcheck
becomes healthy.

Stop containers without deleting the model cache:

```bash
docker compose -f docker-compose.transcription.yml down
```

Deleting the named model volume forces a full model download on the next start.
Do that only as an explicit maintenance action.

## Endpoints

With the development defaults:

| Endpoint | Purpose | Authentication |
| --- | --- | --- |
| `ws://localhost:8001/v1/realtime` | Realtime STT gateway | One-time HMAC token |
| `http://localhost:8001/health/live` | Gateway liveness | None |
| `http://localhost:8001/health/ready` | Gateway and provider readiness | None |
| `http://localhost:8001/health` | Readiness alias | None |
| `http://localhost:8001/metrics` | Prometheus metrics | Optional bearer token |

Speaches port 8000 is exposed only inside the Docker network. Its `/health`
endpoint intentionally remains unauthenticated, as documented by Speaches; all
API endpoints require `SPEACHES_API_KEY`.

The local Speaches image is derived from the pinned upstream release and pins
FastAPI 0.117.1. Speaches 0.9.0-rc.3 invokes an internal `APIRouter` as an ASGI
application during realtime transcription, which is incompatible with FastAPI
0.118 and newer. Keep this compatibility pin until the upstream realtime
implementation no longer relies on that behavior.

## Ephemeral token contract

The NutriOpus server must mint the token after authentication, tenant ownership,
appointment ownership, participant, consent and RBAC checks. Never mint it in a
Client Component.

Token format:

```text
base64url(JSON claims).base64url(HMAC-SHA256(encoded claims))
```

Required claims:

```json
{
  "v": 1,
  "iss": "nutriopus",
  "aud": "transcription-gateway",
  "sub": "authenticated-user-id",
  "tenantId": "tenant-id",
  "appointmentId": "appointment-id",
  "participantId": "participant-id",
  "scope": ["transcription:stream"],
  "model": "deepdml/faster-whisper-large-v3-turbo-ct2",
  "language": "pt",
  "origin": "https://app.example.com",
  "iat": 1760000000,
  "nbf": 1760000000,
  "exp": 1760000060,
  "jti": "unique-random-id"
}
```

`origin` is optional but recommended in production. The default maximum token
lifetime is 120 seconds. Tokens are one-time by default; reconnecting requires a
new token. The in-memory replay cache is per gateway instance. A multi-replica
deployment must use a shared replay store at the edge or route each one-time token
to one instance.

Browsers cannot set an `Authorization` header on `WebSocket`. Pass two
subprotocols instead:

```js
const socket = new WebSocket(
  "wss://transcription.example.com/v1/realtime",
  ["nutriopus", `hmac.${ephemeralToken}`],
);
```

Query-string tokens are disabled because reverse proxies commonly log URLs.
`GATEWAY_ALLOW_QUERY_TOKEN=true` exists only for controlled local diagnostics.

The gateway accepts the OpenAI realtime client events
`session.update`, `input_audio_buffer.append`, `input_audio_buffer.commit` and
`input_audio_buffer.clear`. Audio is PCM16 base64 inside
`input_audio_buffer.append`; binary frames are rejected. The authorized model and
language are taken from the signed token, and a `session.update` cannot override
them.

The mint helper is a reference and a local diagnostic, not the application token
endpoint:

```bash
docker compose -f docker-compose.transcription.yml exec -T transcription-gateway-cpu \
  node scripts/mint-token.mjs \
  --subject user-1 --tenant tenant-1 --appointment appointment-1 \
  --participant participant-1 --origin http://localhost:3000
```

Use `transcription-gateway-gpu` when the GPU profile is active.

## Validation and smoke tests

Check health and provider model discovery without exposing the provider key:

```bash
curl --fail http://localhost:8001/health/live
curl --fail http://localhost:8001/health/ready
docker compose -f docker-compose.transcription.yml exec -T transcription-gateway-cpu \
  node scripts/check-provider.mjs
```

Validate a full authenticated WebSocket handshake through the gateway:

```bash
docker compose -f docker-compose.transcription.yml exec -T transcription-gateway-cpu \
  node scripts/smoke-realtime.mjs
```

Run gateway checks outside Docker:

```bash
cd gateway
npm ci
npm run check
npm test
```

Inspect logs by service. Gateway logs contain connection IDs and technical status,
never tokens, URLs, claims, audio or transcript text:

```bash
docker compose -f docker-compose.transcription.yml logs -f --tail=100 transcription-gateway-cpu
docker compose -f docker-compose.transcription.yml logs -f --tail=100 speaches-cpu
```

## CPU and GPU behavior

The CPU profile uses the official `-cpu` image, CTranslate2 `int8` and automatic
thread selection. It is suitable for development, offline jobs and degraded
operation. The large-v3-turbo model is still the product default, but CPU-only
hardware may not meet realtime latency. Mint a new token for the small fallback
model when latency or capacity policy requires it.

The GPU profile uses the official CUDA image, reserves all NVIDIA GPUs and uses
`float16`. A dedicated CUDA GPU is the recommended production path for realtime.
See [models.md](models.md) for sizing and fallback policy.

## Development security

- Keep `GATEWAY_BIND_ADDRESS=127.0.0.1`.
- Allow only the exact local NutriOpus origins in `GATEWAY_ALLOWED_ORIGINS`.
- Keep Speaches UI disabled and its port unpublished.
- Use different values for the HMAC secret and Speaches API key.
- Do not commit `.env`.

## Production security

- Set `NODE_ENV=production`; startup rejects wildcard origins.
- Use exact HTTPS origins, for example
  `GATEWAY_ALLOWED_ORIGINS=["https://app.nutriopus.com.br"]`.
- Set `GATEWAY_BIND_ADDRESS=0.0.0.0` only behind a TLS reverse proxy and expose
  `wss://`, never plaintext `ws://`, to browsers.
- Preserve `Origin` and WebSocket subprotocol headers in the proxy.
- Keep `GATEWAY_REQUIRE_ORIGIN=true` and query tokens disabled.
- Restrict direct network access to port 8080 to the reverse proxy or load
  balancer.
- Set `GATEWAY_METRICS_BEARER_TOKEN` or block `/metrics` at the proxy.
- Set `GATEWAY_TRUST_PROXY=true` only when untrusted clients cannot bypass the
  trusted proxy; otherwise `X-Forwarded-For` can be forged.
- Store both secrets in the deployment secret manager and rotate them
  independently.
- Pin container images by digest after staging validation.
- Apply host firewall, Docker updates, vulnerability scanning and log retention.

CORS/origin checks reduce browser abuse but are not authentication. HMAC scope,
short expiry, single use and server-side authorization remain mandatory.

## No-audio-storage policy

This stack does not persist audio:

- Gateway containers are read-only and only relay in-memory WebSocket frames.
- Speaches receives streaming frames for inference and has no audio volume.
- The only persistent volume is the Hugging Face model cache.
- Gateway logs and metrics contain no payload, token, transcript, patient or
  tenant labels.
- `TRANSCRIPTION_SAVE_AUDIO=false` is the documented application invariant.

Do not add packet captures, request-body logging, audio bind mounts or debugging
proxies in production. Final transcript persistence belongs to the NutriOpus
application and is outside this infrastructure boundary.

## Observability

Docker healthchecks distinguish:

- Gateway liveness: Node process accepts HTTP.
- Gateway readiness: Speaches `/health` is reachable.
- Speaches health: provider process responds inside the private network.

`/metrics` exposes aggregate Prometheus counters/gauges for active connections,
accepted connections, rejected requests by technical reason, upstream failures,
messages and bytes by direction. It deliberately has no tenant, appointment,
participant or transcript labels.

Speaches can export traces through
`SPEACHES_OTEL_ENDPOINT=http://collector:4317`. The collector must be reachable
from the transcription Docker network. Never add audio or transcript content to
span attributes.

Recommended alerts:

- Gateway readiness failing for 2 minutes.
- Speaches unhealthy/restarting.
- Increase in `upstream_failures_total`.
- Sustained `rate_limited`, `connection_limit` or `token_replayed` rejections.
- GPU memory/temperature and host disk pressure.
- Transcription latency and failure rate from aggregate application metrics.

## Troubleshooting

`Speaches remains starting`

- First boot downloads about 2 GB of model weights plus image layers.
- Check `docker compose ... logs speaches-cpu` (or `speaches-gpu`).
- Confirm outbound access to Hugging Face and available disk.
- Add `HF_TOKEN` if registry rate limits apply.
- Increase `SPEACHES_HEALTH_START_PERIOD` on a slow link.

`GPU is not detected`

- Run the `nvidia-smi` container command from Quick start.
- Install/configure NVIDIA Container Toolkit for Docker.
- Confirm only the `gpu` profile is enabled.
- Check that the host driver supports the image CUDA runtime.

`Gateway returns 401`

- Mint a new token; tokens expire quickly and are single use.
- Confirm issuer, audience, HMAC secret, scope, `iat`/`exp` and allowed model.
- Synchronize host clocks with NTP.
- Use both WebSocket subprotocols: `nutriopus` and `hmac.<token>`.

`Gateway returns 403`

- Add the exact browser origin, including scheme and port.
- If the token has an `origin` claim, it must exactly match the request origin.
- Never solve a production mismatch with `*`.

`Gateway returns 429 or closes with 1008/1009`

- Keep PCM16 mono chunks near the configured 1000 ms product target.
- Inspect aggregate rejection metrics.
- Change limits only after measuring real payload sizes and abuse risk.

`Gateway is live but not ready`

- Speaches is offline, downloading models or unhealthy.
- Run `scripts/check-provider.mjs` inside the active gateway container.
- The NutriOpus appointment must continue without transcription and display a
  controlled provider-offline state.

`Model is accepted but transcription is slow`

- Use CUDA for realtime.
- Check model load time, GPU utilization and chunk cadence.
- Reconnect with a newly issued token whose signed `model` is
  `Systran/faster-whisper-small`.

## Upstream references

- Speaches installation: https://speaches.ai/installation/
- Speaches configuration: https://speaches.ai/configuration/
- Speaches realtime API: https://speaches.ai/usage/realtime-api/
- Speaches API (`/health`, `/v1/models`): https://speaches.ai/api/
- Speaches source: https://github.com/speaches-ai/speaches

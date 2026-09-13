# Provider strategy

## Primary provider: Speaches

Speaches is the primary self-hosted provider because it combines faster-whisper,
CPU/CUDA images, model discovery, health diagnostics and an OpenAI-compatible
realtime WebSocket API.

Runtime contract:

| Capability | Value |
| --- | --- |
| Internal realtime URL | `ws://speaches:8000/v1/realtime` |
| Realtime mode | `intent=transcription` |
| Internal health URL | `http://speaches:8000/health` |
| Model discovery | `GET /v1/models` with provider API key |
| Authentication | `Authorization: Bearer <SPEACHES_API_KEY>` |
| Browser access | Never; gateway only |
| Audio persistence | None |

The gateway constructs the upstream URL from signed claims and injects the
provider key in a server-side header. It forwards only the supported realtime
client events and relays provider events unchanged. The browser cannot select an
unsigned model, call conversation mode or learn the provider key.

Official references:

- https://speaches.ai/usage/realtime-api/
- https://speaches.ai/configuration/
- https://speaches.ai/api/

## Provider status

Interpret status at the application boundary as:

| Status | Meaning |
| --- | --- |
| `online` | Gateway `/health/ready` returned HTTP 200 |
| `offline` | Readiness returned 503 or timed out |
| `degraded` | Readiness is healthy but latency/error thresholds are breached |

Provider failure must never block an appointment. The application should stop
capture or its short reconnect buffer, show a controlled warning, request a new
ephemeral token and retry with backoff. It should persist final segments only.

## Model fallback

The provider does not silently swap a model. NutriOpus owns the policy:

1. Detect provider/model failure or sustained latency.
2. End the failed WebSocket.
3. Request a new one-time token signed for
   `Systran/faster-whisper-small`.
4. Reconnect through the same gateway URL.
5. Record only technical metadata about the fallback, never transcript text.

This keeps model usage visible in metrics and avoids changing recognition quality
halfway through an unidentified stream.

## Prepared alternatives

| Provider | Transport | Best fit | Integration note |
| --- | --- | --- | --- |
| `whisper_cpp` | HTTP/WebSocket adapter | CPU/local deployment | Put behind the same gateway/token boundary |
| `whisper_live` | WebSocket | Near-live Whisper variants | Normalize provider events before application use |
| `vosk` | WebSocket/gRPC | Lower latency, smaller hardware | Validate pt-BR quality before production |
| `mock` | In-process/test transport | Deterministic app tests | No clinical audio |

These alternatives are not started by this Compose. A future provider must keep
the external NutriOpus contract stable: ephemeral appointment-scoped auth,
partial/final events, provider health, no browser secret and no audio storage.

## Security invariants for every provider

- Provider ports stay private.
- Browser access always passes through an authenticated gateway.
- Token authorization happens after NutriOpus tenant/RBAC/appointment checks.
- Secrets are never included in JavaScript bundles, query strings, logs or
  metrics.
- Audio payloads and transcript text are not logged.
- Admin/infra metrics remain aggregate and contain no clinical content.
- Audio has no persistent volume or object-storage destination.
- Production transport uses TLS (`wss://`) at the ingress.

# Transcription models

## Product defaults

| Role | Model ID | Download size | Intended runtime |
| --- | --- | ---: | --- |
| Default | `deepdml/faster-whisper-large-v3-turbo-ct2` | About 1.62 GB | NVIDIA GPU, `float16` |
| Fallback | `Systran/faster-whisper-small` | About 486 MB | GPU or CPU, CPU `int8` |

Both repositories contain CTranslate2 weights compatible with faster-whisper.
Speaches downloads them into the persistent Hugging Face cache at startup.

Sources:

- https://huggingface.co/deepdml/faster-whisper-large-v3-turbo-ct2
- https://huggingface.co/Systran/faster-whisper-small

## Default: large-v3-turbo

`large-v3-turbo` is multilingual and is the signed default model for Brazilian
Portuguese. The supplied GPU profile uses `float16`. Allow at least 6 GB of GPU
memory for a conservative single-worker deployment after accounting for runtime
and container overhead; validate concurrency and latency on the production GPU.

The model can run on CPU, but the Speaches documentation warns that actual
realtime STT performance requires CUDA. CPU support is therefore an operational
fallback, not a guaranteed realtime production target.

## Fallback: small

`Systran/faster-whisper-small` is multilingual and materially lighter. The CPU
profile uses `int8` to reduce memory use. Use it when:

- GPU capacity is exhausted.
- Large-model latency breaches the product threshold.
- A CPU-only installation cannot keep up with chunk cadence.
- The default model fails to load and provider health has been investigated.

Fallback is explicit and auditable: the NutriOpus server issues a new ephemeral
token with the fallback model in the signed `model` claim. The gateway never
silently changes models during an active clinical session.

## Model lifecycle

`PRELOAD_MODELS` makes startup download both model IDs and fail if either cannot
be resolved. It does not write audio. `STT_MODEL_TTL=900` unloads an idle STT
model after 15 minutes; use `-1` only on dedicated hardware with enough memory.

Recommended rollout:

1. Pull and start in staging.
2. Wait for provider and gateway readiness.
3. Run the provider and realtime smoke checks.
4. Test representative pt-BR consultation audio with consent.
5. Measure first-segment latency, steady-state latency, CPU/GPU memory and error
   rate.
6. Pin the validated Speaches image by digest in production.

Changing model IDs requires updating all of:

- `TRANSCRIPTION_DEFAULT_MODEL` or `TRANSCRIPTION_FALLBACK_MODEL`.
- `TRANSCRIPTION_ALLOWED_MODELS`.
- `SPEACHES_PRELOAD_MODELS`.
- The server-side token issuer policy.

The gateway rejects a token model not present in the allowlist and rejects a
client `session.update` that tries to override the signed model.

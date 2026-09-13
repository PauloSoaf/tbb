const healthUrl = process.env.SPEACHES_HEALTH_URL;
const apiKey = process.env.SPEACHES_API_KEY;

if (!healthUrl || !apiKey) {
  throw new Error("SPEACHES_HEALTH_URL and SPEACHES_API_KEY are required");
}

const healthResponse = await fetch(healthUrl, {
  headers: { accept: "application/json" },
});
if (!healthResponse.ok) {
  throw new Error(`Speaches health returned HTTP ${healthResponse.status}`);
}

const modelsUrl = new URL("/v1/models", healthUrl);
const modelsResponse = await fetch(modelsUrl, {
  headers: {
    accept: "application/json",
    authorization: `Bearer ${apiKey}`,
  },
});
if (!modelsResponse.ok) {
  throw new Error(`Speaches models returned HTTP ${modelsResponse.status}`);
}

const payload = await modelsResponse.json();
const models = Array.isArray(payload.data)
  ? payload.data.map((model) => model.id).filter(Boolean)
  : [];

process.stdout.write(
  `${JSON.stringify({ health: "ok", installedModels: models }, null, 2)}\n`,
);

/**
 * Cálculos de percentual de gordura por protocolos de dobras cutâneas.
 * Fórmula de Siri (1956): %G = (4,95 / D - 4,50) × 100
 */

export type SkinfoldInput = {
  age: number;
  sex: "M" | "F";
  weight?: number;
  chest?: number;
  axillary?: number;
  triceps?: number;
  subscapular?: number;
  abdominal?: number;
  suprailiac?: number;
  thigh?: number;
  medialCalf?: number;
};

export type SkinfoldResult = {
  bodyDensity: number | null;
  bodyFatPct: number;
  bodyFatKg: number | null;
  leanMassKg: number | null;
};

function siri(density: number): number {
  return (4.95 / density - 4.5) * 100;
}

function toKg(pct: number, weight: number | undefined): { kg: number | null; lean: number | null } {
  if (!weight) return { kg: null, lean: null };
  const kg = (pct / 100) * weight;
  return { kg: parseFloat(kg.toFixed(2)), lean: parseFloat((weight - kg).toFixed(2)) };
}

// ─── Pollock 3 dobras ────────────────────────────────────────────────────────
// Masculino: peitoral + abdominal + coxa
function pollock3Male(input: SkinfoldInput): SkinfoldResult {
  const { age, weight, chest = 0, abdominal = 0, thigh = 0 } = input;
  const sum = chest + abdominal + thigh;
  const D = 1.10938 - 0.0008267 * sum + 0.0000016 * sum ** 2 - 0.0002574 * age;
  const pct = parseFloat(siri(D).toFixed(2));
  const { kg, lean } = toKg(pct, weight);
  return { bodyDensity: parseFloat(D.toFixed(5)), bodyFatPct: pct, bodyFatKg: kg, leanMassKg: lean };
}

// Feminino: tríceps + supraíliaca + coxa
function pollock3Female(input: SkinfoldInput): SkinfoldResult {
  const { age, weight, triceps = 0, suprailiac = 0, thigh = 0 } = input;
  const sum = triceps + suprailiac + thigh;
  const D = 1.0994921 - 0.0009929 * sum + 0.0000023 * sum ** 2 - 0.0001392 * age;
  const pct = parseFloat(siri(D).toFixed(2));
  const { kg, lean } = toKg(pct, weight);
  return { bodyDensity: parseFloat(D.toFixed(5)), bodyFatPct: pct, bodyFatKg: kg, leanMassKg: lean };
}

// ─── Pollock 7 dobras (unissex) ──────────────────────────────────────────────
function pollock7(input: SkinfoldInput): SkinfoldResult {
  const { age, sex, weight, chest = 0, axillary = 0, triceps = 0, subscapular = 0, abdominal = 0, suprailiac = 0, thigh = 0 } = input;
  const sum = chest + axillary + triceps + subscapular + abdominal + suprailiac + thigh;
  let D: number;
  if (sex === "M") {
    D = 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * age;
  } else {
    D = 1.097 - 0.00046971 * sum + 0.00000056 * sum ** 2 - 0.00012828 * age;
  }
  const pct = parseFloat(siri(D).toFixed(2));
  const { kg, lean } = toKg(pct, weight);
  return { bodyDensity: parseFloat(D.toFixed(5)), bodyFatPct: pct, bodyFatKg: kg, leanMassKg: lean };
}

// ─── Guedes (1985) ──────────────────────────────────────────────────────────
// Masculino: subescapular + abdominal + coxa
// Feminino: subescapular + supraíliaca + coxa
function guedes(input: SkinfoldInput): SkinfoldResult {
  const { sex, weight, subscapular = 0, abdominal = 0, suprailiac = 0, thigh = 0 } = input;
  let D: number;
  if (sex === "M") {
    const sum = subscapular + abdominal + thigh;
    D = 1.1714 - 0.0671 * Math.log10(sum);
  } else {
    const sum = subscapular + suprailiac + thigh;
    D = 1.1665 - 0.0706 * Math.log10(sum);
  }
  const pct = parseFloat(siri(D).toFixed(2));
  const { kg, lean } = toKg(pct, weight);
  return { bodyDensity: parseFloat(D.toFixed(5)), bodyFatPct: pct, bodyFatKg: kg, leanMassKg: lean };
}

// ─── Petroski (1995) ────────────────────────────────────────────────────────
// Masculino: subescapular + triceps + supraíliaca + panturrilha medial
// Feminino: subescapular + supraíliaca + abdominal + panturrilha medial
function petroski(input: SkinfoldInput): SkinfoldResult {
  const { age, sex, weight, subscapular = 0, triceps = 0, suprailiac = 0, abdominal = 0, medialCalf = 0 } = input;
  let D: number;
  if (sex === "M") {
    const sum = subscapular + triceps + suprailiac + medialCalf;
    D = 1.10726863 - 0.00081201 * sum + 0.00000212 * sum ** 2 - 0.00041761 * age;
  } else {
    const sum = subscapular + suprailiac + abdominal + medialCalf;
    D = 1.0954 - 0.0004650 * sum + 0.0000056 * sum ** 2 - 0.0001314 * age;
  }
  const pct = parseFloat(siri(D).toFixed(2));
  const { kg, lean } = toKg(pct, weight);
  return { bodyDensity: parseFloat(D.toFixed(5)), bodyFatPct: pct, bodyFatKg: kg, leanMassKg: lean };
}

// ─── Durnin & Womersley (1974) ──────────────────────────────────────────────
// Unissex: bíceps + tríceps + subescapular + supraíliaca
function durninWomersley(input: SkinfoldInput): SkinfoldResult {
  const { age, sex, weight, triceps = 0, subscapular = 0, suprailiac = 0 } = input;
  const sum = triceps + subscapular + suprailiac; // simplificado: sem bíceps no modelo
  const logSum = Math.log10(sum);
  let D: number;
  // Constantes para adultos 17-72 anos (Durnin & Womersley tabela geral)
  if (sex === "M") {
    if (age < 30) D = 1.1620 - 0.0630 * logSum;
    else if (age < 40) D = 1.1422 - 0.0544 * logSum;
    else if (age < 50) D = 1.1620 - 0.0700 * logSum;
    else D = 1.1715 - 0.0779 * logSum;
  } else {
    if (age < 30) D = 1.1549 - 0.0678 * logSum;
    else if (age < 40) D = 1.1423 - 0.0632 * logSum;
    else if (age < 50) D = 1.1333 - 0.0612 * logSum;
    else D = 1.1339 - 0.0645 * logSum;
  }
  const pct = parseFloat(siri(D).toFixed(2));
  const { kg, lean } = toKg(pct, weight);
  return { bodyDensity: parseFloat(D.toFixed(5)), bodyFatPct: pct, bodyFatKg: kg, leanMassKg: lean };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export type Protocol =
  | "POLLOCK_3_MALE"
  | "POLLOCK_3_FEMALE"
  | "POLLOCK_7"
  | "GUEDES"
  | "PETROSKI_MALE"
  | "PETROSKI_FEMALE"
  | "DURNIN_WOMERSLEY";

export function calculateSkinfold(protocol: Protocol, input: SkinfoldInput): SkinfoldResult {
  switch (protocol) {
    case "POLLOCK_3_MALE":    return pollock3Male(input);
    case "POLLOCK_3_FEMALE":  return pollock3Female(input);
    case "POLLOCK_7":         return pollock7(input);
    case "GUEDES":            return guedes(input);
    case "PETROSKI_MALE":     return petroski({ ...input, sex: "M" });
    case "PETROSKI_FEMALE":   return petroski({ ...input, sex: "F" });
    case "DURNIN_WOMERSLEY":  return durninWomersley(input);
  }
}

export const PROTOCOL_LABELS: Record<Protocol, string> = {
  POLLOCK_3_MALE:   "Pollock 3 dobras (masc.)",
  POLLOCK_3_FEMALE: "Pollock 3 dobras (fem.)",
  POLLOCK_7:        "Pollock 7 dobras",
  GUEDES:           "Guedes",
  PETROSKI_MALE:    "Petroski (masc.)",
  PETROSKI_FEMALE:  "Petroski (fem.)",
  DURNIN_WOMERSLEY: "Durnin-Womersley",
};

export const PROTOCOL_FIELDS: Record<Protocol, (keyof SkinfoldInput)[]> = {
  POLLOCK_3_MALE:   ["chest", "abdominal", "thigh"],
  POLLOCK_3_FEMALE: ["triceps", "suprailiac", "thigh"],
  POLLOCK_7:        ["chest", "axillary", "triceps", "subscapular", "abdominal", "suprailiac", "thigh"],
  GUEDES:           ["subscapular", "abdominal", "thigh"],
  PETROSKI_MALE:    ["subscapular", "triceps", "suprailiac", "medialCalf"],
  PETROSKI_FEMALE:  ["subscapular", "suprailiac", "abdominal", "medialCalf"],
  DURNIN_WOMERSLEY: ["triceps", "subscapular", "suprailiac"],
};

export const FIELD_LABELS: Record<string, string> = {
  chest:       "Peitoral (mm)",
  axillary:    "Axilar média (mm)",
  triceps:     "Tríceps (mm)",
  subscapular: "Subescapular (mm)",
  abdominal:   "Abdominal (mm)",
  suprailiac:  "Supraíliaca (mm)",
  thigh:       "Coxa (mm)",
  medialCalf:  "Panturrilha medial (mm)",
};

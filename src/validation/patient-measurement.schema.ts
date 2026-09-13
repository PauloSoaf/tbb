import { z } from "zod";

export const patientMeasurementSchema = z.object({
  measuredAt: z.string().optional(),
  source: z.enum(["MANUAL", "BIOIMPEDANCE", "SKINFOLD", "PHOTO_ESTIMATION"]),

  // Keep the demographic reference used for this individual assessment. It is
  // intentionally optional so historic records and the quick-weight flow keep
  // working, while the clinical assessment form always sends a value.
  assessmentProfile: z.enum(["CHILD", "ADULT", "ELDERLY"]).optional().nullable(),
  assessmentAge: z.number().int().min(0).max(130).optional().nullable(),
  biologicalSex: z.enum(["M", "F", "UNSPECIFIED"]).optional().nullable(),
  
  weight: z.number().positive("Peso deve ser positivo").optional().nullable(),
  height: z.number().positive("Altura deve ser positiva").optional().nullable(),
  
  waist: z.number().positive("Cintura deve ser positiva").optional().nullable(),
  hip: z.number().positive("Quadril deve ser positivo").optional().nullable(),
  waistHeightRatio: z.number().positive().max(2).optional().nullable(),
  waistHipRisk: z.string().max(80).optional().nullable(),
  waistHeightRisk: z.string().max(80).optional().nullable(),
  
  neck: z.number().positive("Pescoço deve ser positivo").optional().nullable(),
  chest: z.number().positive("Tórax deve ser positivo").optional().nullable(),
  abdomen: z.number().positive("Abdômen deve ser positivo").optional().nullable(),
  relaxedArm: z.number().positive("Braço relaxado deve ser positivo").optional().nullable(),
  contractedArm: z.number().positive("Braço contraído deve ser positivo").optional().nullable(),
  forearm: z.number().positive("Antebraço deve ser positivo").optional().nullable(),
  thigh: z.number().positive("Coxa deve ser positiva").optional().nullable(),
  calf: z.number().positive("Panturrilha deve ser positiva").optional().nullable(),
  
  bodyFatPercentage: z
    .number()
    .min(0, "Percentual de gordura não pode ser negativo")
    .max(100, "Percentual de gordura não pode ser maior que 100")
    .optional()
    .nullable(),

  // The raw, triplicate skinfold readings are encoded as a compact JSON
  // document by the client panel. The server action parses and recomputes all
  // derived values before persisting them; these browser values are never
  // trusted as clinical results.
  skinfoldProtocol: z
    .enum(["POLLOCK_3_MALE", "POLLOCK_3_FEMALE", "POLLOCK_7", "DURNIN_WOMERSLEY", "SLAUGHTER", "MANUAL"])
    .optional()
    .nullable(),
  skinfoldMeasurements: z.string().max(20_000).optional().nullable(),
  skinfoldSum: z.number().nonnegative().max(1_000).optional().nullable(),
  skinfoldBodyDensity: z.number().positive().max(2).optional().nullable(),
  skinfoldFormula: z.string().max(160).optional().nullable(),
    
  notes: z.string().max(10_000).optional().nullable(),
});

export type PatientMeasurementFormData = z.infer<typeof patientMeasurementSchema>;

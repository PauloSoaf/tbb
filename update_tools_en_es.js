const fs = require('fs');

const tools_en = {
  "subtitle": "Utilities for your clinical practice",
  "access": "Access",
  "back_to_tools": "Back to Tools",
  "calculators": {
    "title": "Clinical Calculators",
    "desc": "BMI, Ideal Weight, BMR and other quick formulas.",
    "imc_title": "Body Mass Index (BMI)",
    "weight_kg": "Weight (kg)",
    "height_cm": "Height (cm)",
    "imc_underweight": "Underweight",
    "imc_normal": "Normal weight",
    "imc_overweight": "Overweight",
    "imc_obesity_1": "Obesity Class I",
    "imc_obesity_2": "Obesity Class II",
    "imc_obesity_3": "Obesity Class III",
    "tmb_vet_title": "BMR and TDEE",
    "tmb_vet_tooltip": "BMR (Basal Metabolic Rate) is the energy required to maintain vital functions at rest. TDEE (Total Daily Energy Expenditure) is the total energy spent including daily activities and exercises.",
    "formula_mifflin": "Mifflin-St Jeor Formula",
    "age": "Age",
    "gender": "Gender",
    "female": "Female",
    "male": "Male",
    "activity_level": "Activity Level",
    "tmb_rest": "BMR (rest):",
    "vet_total": "TDEE (total spent):",
    "weight_loss": "Weight Loss (−500)",
    "maintenance": "Maintenance",
    "weight_gain": "Gain (+300)",
    "rcq_title": "Waist-to-Hip Ratio (WHR)",
    "rcq_desc": "WHO Reference — cardiovascular metabolic risk",
    "waist_cm": "Waist (cm)",
    "hip_cm": "Hip (cm)",
    "oms_ref": "WHO Reference",
    "low": "Low",
    "moderate": "Moderate",
    "high": "High",
    "very_high": "Very high",
    "waist_circumference_title": "Risk by Waist Circumference",
    "waist_circumference_desc": "WHO / IDF Reference — cardiovascular and metabolic risk",
    "waist_circumference": "Waist circumference (cm)",
    "classification": "Classification:",
    "oms_cutoffs": "WHO cutoffs",
    "cutoffs_female": "< 80 cm: no risk · 80–87 cm: increased · ≥ 88 cm: very high",
    "cutoffs_male": "< 94 cm: no risk · 94–101 cm: increased · ≥ 102 cm: very high"
  },
  "taco": {
    "title": "TACO Table",
    "desc": "Instant search for foods and nutritional composition."
  },
  "templates": {
    "title": "Template Repository",
    "desc": "Save your menu templates and frequent texts."
  },
  "clinic_report": {
    "title": "Clinic Report",
    "desc": "Overview of engagement, goals and averages of all patients."
  },
  "plan_studio": {
    "title": "Plan Studio",
    "desc": "Create and edit reusable menu templates across patients."
  },
  "wellness_panel": {
    "title": "Wellness Panel",
    "desc": "View mood and energy check-ins for all patients."
  },
  "compare_patients": {
    "title": "Compare Patients",
    "desc": "Analyze progress, goals, and engagement in two columns."
  }
};

const tools_es = {
  "subtitle": "Utilidades para su práctica clínica",
  "access": "Acceder",
  "back_to_tools": "Volver a Herramientas",
  "calculators": {
    "title": "Calculadoras Clínicas",
    "desc": "IMC, Peso Ideal, TMB y otras fórmulas rápidas.",
    "imc_title": "Índice de Masa Corporal (IMC)",
    "weight_kg": "Peso (kg)",
    "height_cm": "Altura (cm)",
    "imc_underweight": "Bajo peso",
    "imc_normal": "Peso normal",
    "imc_overweight": "Sobrepeso",
    "imc_obesity_1": "Obesidad Grado 1",
    "imc_obesity_2": "Obesidad Grado 2",
    "imc_obesity_3": "Obesidad Grado 3",
    "tmb_vet_title": "TMB y GET",
    "tmb_vet_tooltip": "La TMB (Tasa Metabólica Basal) es la energía necesaria para mantener las funciones vitales en reposo. GET (Gasto Energético Total) es la energía total gastada, incluidas las actividades diarias y el ejercicio.",
    "formula_mifflin": "Fórmula de Mifflin-St Jeor",
    "age": "Edad",
    "gender": "Sexo",
    "female": "Femenino",
    "male": "Masculino",
    "activity_level": "Nivel de actividad",
    "tmb_rest": "TMB (reposo):",
    "vet_total": "GET (gasto total):",
    "weight_loss": "Pérdida de Peso (−500)",
    "maintenance": "Mantenimiento",
    "weight_gain": "Aumento (+300)",
    "rcq_title": "Índice Cintura-Cadera (ICC)",
    "rcq_desc": "Referencia OMS — riesgo cardiovascular y metabólico",
    "waist_cm": "Cintura (cm)",
    "hip_cm": "Cadera (cm)",
    "oms_ref": "Referencia OMS",
    "low": "Bajo",
    "moderate": "Moderado",
    "high": "Alto",
    "very_high": "Muy alto",
    "waist_circumference_title": "Riesgo por Circunferencia de Cintura",
    "waist_circumference_desc": "Referencia OMS / IDF — riesgo cardiovascular y metabólico",
    "waist_circumference": "Circunferencia de cintura (cm)",
    "classification": "Clasificación:",
    "oms_cutoffs": "Puntos de corte de la OMS",
    "cutoffs_female": "< 80 cm: sin riesgo · 80–87 cm: aumentado · ≥ 88 cm: muy alto",
    "cutoffs_male": "< 94 cm: sin riesgo · 94–101 cm: aumentado · ≥ 102 cm: muy alto"
  },
  "taco": {
    "title": "Tabla TACO",
    "desc": "Búsqueda instantánea de alimentos y composición nutricional."
  },
  "templates": {
    "title": "Repositorio de Plantillas",
    "desc": "Guarde sus plantillas de menú y textos frecuentes."
  },
  "clinic_report": {
    "title": "Informe de la Clínica",
    "desc": "Resumen del compromiso, metas y promedios de todos los pacientes."
  },
  "plan_studio": {
    "title": "Estudio de Planes",
    "desc": "Cree y edite plantillas de menús reutilizables entre pacientes."
  },
  "wellness_panel": {
    "title": "Panel de Bienestar",
    "desc": "Vea el estado de ánimo y energía de todos los pacientes."
  },
  "compare_patients": {
    "title": "Comparar Pacientes",
    "desc": "Analice la evolución, metas y compromiso en dos columnas."
  }
};

const enPath = `c:/Projetos/tcc/NutriOpus/src/lib/i18n/en.json`;
const esPath = `c:/Projetos/tcc/NutriOpus/src/lib/i18n/es.json`;

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
enData.tools = tools_en;
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2));

const esData = JSON.parse(fs.readFileSync(esPath, 'utf8'));
esData.tools = tools_es;
fs.writeFileSync(esPath, JSON.stringify(esData, null, 2));

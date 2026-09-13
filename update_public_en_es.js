const fs = require('fs');

const public_page_en = {
  "metadata": {
    "desc": "Nutritional care with {name}. Fill out your pre-consultation, talk via WhatsApp and access your patient portal.",
    "og_desc": "Schedule your consultation with {name}."
  },
  "sections": {
    "about": "About",
    "specialties": "Specialties",
    "care": "Care",
    "contact": "Contact",
    "how_it_works": "How it works",
    "how_it_works_subtitle": "A simple and straightforward process for your nutritional care",
    "specialties_subtitle": "Areas of expertise in your care.",
    "patient_portal": "Patient Portal",
    "patient_portal_desc": "Track your meal plan, shopping list and guidelines directly in the app."
  },
  "actions": {
    "fill_preconsultation": "Fill out Pre-consultation",
    "whatsapp": "WhatsApp",
    "patient_login": "Patient Login",
    "access_portal": "Access Portal"
  },
  "hero": {
    "badge": "Nutrition & Health",
    "title": "Nutritional Care"
  },
  "profile": {
    "no_bio": "Nutritionist and specialist in health and wellness.",
    "humanized_care": "Humanized Care",
    "patients_count": "+{count} active patients"
  },
  "how_it_works": {
    "step_1_title": "Scheduling",
    "step_1_description": "You get in touch and we schedule the best time for your consultation.",
    "step_2_title": "Pre-consultation",
    "step_2_description": "You fill out a quick form with your details and goals.",
    "step_3_title": "Consultation",
    "step_3_description": "We talk about your routine, eating habits and set goals.",
    "step_4_title": "Follow-up",
    "step_4_description": "You receive the meal plan and access the patient portal."
  },
  "contact": {
    "whatsapp": "WhatsApp",
    "email": "E-mail",
    "address": "Address",
    "location": "Location"
  },
  "footer": {
    "powered_by": "Powered by NutriOpus",
    "privacy": "Privacy"
  }
};

const public_page_es = {
  "metadata": {
    "desc": "Atención nutricional con {name}. Complete su preconsulta, hable por WhatsApp y acceda a su portal del paciente.",
    "og_desc": "Programe su consulta con {name}."
  },
  "sections": {
    "about": "Sobre mí",
    "specialties": "Especialidades",
    "care": "Atención",
    "contact": "Contacto",
    "how_it_works": "Cómo funciona",
    "how_it_works_subtitle": "Un proceso simple y directo para su seguimiento nutricional",
    "specialties_subtitle": "Áreas de actuación y experiencia en su atención.",
    "patient_portal": "Portal del Paciente",
    "patient_portal_desc": "Realice un seguimiento de su plan de comidas, lista de compras y pautas directamente en la aplicación."
  },
  "actions": {
    "fill_preconsultation": "Llenar Preconsulta",
    "whatsapp": "WhatsApp",
    "patient_login": "Inicio de sesión de paciente",
    "access_portal": "Acceder al Portal"
  },
  "hero": {
    "badge": "Nutrición y Salud",
    "title": "Atención Nutricional"
  },
  "profile": {
    "no_bio": "Nutricionista y especialista en salud y bienestar.",
    "humanized_care": "Atención Humanizada",
    "patients_count": "+{count} pacientes activos"
  },
  "how_it_works": {
    "step_1_title": "Programación",
    "step_1_description": "Usted se pone en contacto y programamos el mejor momento para su consulta.",
    "step_2_title": "Preconsulta",
    "step_2_description": "Usted llena un formulario rápido con sus datos y objetivos.",
    "step_3_title": "Consulta",
    "step_3_description": "Hablamos sobre su rutina, hábitos alimenticios y establecemos metas.",
    "step_4_title": "Seguimiento",
    "step_4_description": "Usted recibe el plan de comidas y accede al portal del paciente."
  },
  "contact": {
    "whatsapp": "WhatsApp",
    "email": "E-mail",
    "address": "Dirección",
    "location": "Ubicación"
  },
  "footer": {
    "powered_by": "Powered by NutriOpus",
    "privacy": "Privacidad"
  }
};

const enPath = `c:/Projetos/tcc/NutriOpus/src/lib/i18n/en.json`;
const esPath = `c:/Projetos/tcc/NutriOpus/src/lib/i18n/es.json`;

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
enData.public_page = public_page_en;
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2));

const esData = JSON.parse(fs.readFileSync(esPath, 'utf8'));
esData.public_page = public_page_es;
fs.writeFileSync(esPath, JSON.stringify(esData, null, 2));

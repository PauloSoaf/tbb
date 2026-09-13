const fs = require('fs');

const public_page = {
  "metadata": {
    "desc": "Atendimento nutricional com {name}. Preencha sua pré-consulta, fale pelo WhatsApp e acesse seu portal do paciente.",
    "og_desc": "Agende sua consulta com {name}."
  },
  "sections": {
    "about": "Sobre",
    "specialties": "Especialidades",
    "care": "Atendimento",
    "contact": "Contato",
    "how_it_works": "Como funciona",
    "how_it_works_subtitle": "Um processo simples e direto para o seu acompanhamento nutricional",
    "specialties_subtitle": "Áreas de atuação e expertise no seu atendimento.",
    "patient_portal": "Portal do Paciente",
    "patient_portal_desc": "Acompanhe seu plano alimentar, lista de compras e orientações diretamente no app."
  },
  "actions": {
    "fill_preconsultation": "Preencher Pré-consulta",
    "whatsapp": "WhatsApp",
    "patient_login": "Login de Paciente",
    "access_portal": "Acessar Portal"
  },
  "hero": {
    "badge": "Nutrição & Saúde",
    "title": "Atendimento Nutricional"
  },
  "profile": {
    "no_bio": "Nutricionista e especialista em saúde e bem-estar.",
    "humanized_care": "Atendimento Humanizado",
    "patients_count": "+{count} pacientes ativos"
  },
  "how_it_works": {
    "step_1_title": "Agendamento",
    "step_1_description": "Você entra em contato e agendamos o melhor horário para a sua consulta.",
    "step_2_title": "Pré-consulta",
    "step_2_description": "Você preenche um formulário rápido com seus dados e objetivos.",
    "step_3_title": "Consulta",
    "step_3_description": "Conversamos sobre sua rotina, alimentação e traçamos metas.",
    "step_4_title": "Acompanhamento",
    "step_4_description": "Você recebe o plano alimentar e acessa o portal do paciente."
  },
  "contact": {
    "whatsapp": "WhatsApp",
    "email": "E-mail",
    "address": "Endereço",
    "location": "Localização"
  },
  "footer": {
    "powered_by": "Powered by NutriOpus",
    "privacy": "Privacidade"
  }
};

['pt.json', 'en.json', 'es.json'].forEach(file => {
  const path = `c:/Projetos/tcc/NutriOpus/src/lib/i18n/${file}`;
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  data.public_page = public_page;
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
});

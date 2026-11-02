import {
  emptyProfile,
  profileContentSchema,
  resumeContentSchema,
  type ProfileContent,
  type ResumeContent,
} from "./schemas";

export function resolveResume(
  input: unknown,
  baseInput: unknown,
): ProfileContent {
  const content = resumeContentSchema.parse(input),
    base = profileContentSchema.safeParse(baseInput).data ?? emptyProfile;
  const contact = content.useBaseContact
    ? {
        name: base.name,
        headline: base.headline,
        email: base.email,
        phone: base.phone,
        location: base.location,
        website: base.website,
      }
    : {};
  const linked = content.baseEntryIds.flatMap(
    (id) => base.entries.find((e) => e.id === id) ?? [],
  );
  return {
    ...content,
    ...contact,
    skills: content.useBaseSkills ? base.skills : content.skills,
    entries: [...linked, ...content.entries],
  };
}

export function resumeMarkdown(content: ProfileContent, language = "pt") {
  const headings =
    language === "en"
      ? {
          summary: "Summary",
          skills: "Skills",
          EXPERIENCE: "Experience",
          EDUCATION: "Education",
          PROJECT: "Projects",
          CERTIFICATION: "Certifications",
        }
      : language === "es"
        ? {
            summary: "Perfil",
            skills: "Habilidades",
            EXPERIENCE: "Experiencia",
            EDUCATION: "Formación",
            PROJECT: "Proyectos",
            CERTIFICATION: "Certificaciones",
          }
        : {
            summary: "Perfil",
            skills: "Competências",
            EXPERIENCE: "Experiência",
            EDUCATION: "Formação",
            PROJECT: "Projetos",
            CERTIFICATION: "Certificações",
          };
  return [
    `# ${content.name}`,
    content.headline,
    [content.email, content.phone, content.location, content.website]
      .filter(Boolean)
      .join(" · "),
    content.summary ? `## ${headings.summary}\n${content.summary}` : "",
    content.skills.length
      ? `## ${headings.skills}\n${content.skills.join(" · ")}`
      : "",
    ...content.entries.map(
      (e) =>
        `## ${headings[e.type]}: ${e.title}\n${[e.organization, e.period].filter(Boolean).join(" · ")}\n\n${e.description}${e.url ? `\n\n${e.url}` : ""}`,
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}
export function baseResume(): ResumeContent {
  return resumeContentSchema.parse({
    useBaseContact: true,
    useBaseSkills: true,
  });
}

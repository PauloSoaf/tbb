import { jsPDF } from "jspdf";
import type { ProfileContent } from "./schemas";
import { resumeMarkdown } from "./resume";

/** Text is emitted as PDF text operators, never screenshots. Links remain annotations. */
export function buildResumePdf(
  content: ProfileContent,
  settings: { language: string; template: string; spacing: string },
) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" }),
    left = 19,
    right = 191,
    width = right - left;
  const lineHeight =
    settings.spacing === "COMPACT"
      ? 4.5
      : settings.spacing === "AIRY"
        ? 5.8
        : 5.1;
  let y = 20;
  const ensure = (height: number) => {
    if (y + height > 277) {
      pdf.addPage();
      y = 20;
    }
  };
  const text = (value: string, size = 10, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines: string[] = pdf.splitTextToSize(value, width);
    for (const line of lines) {
      ensure(lineHeight);
      pdf.text(line, left, y);
      y += lineHeight;
    }
    y += 2;
  };
  pdf.setProperties({
    title: content.name ? `Currículo — ${content.name}` : "Currículo",
    subject: content.headline,
    creator: "TBB Carreira",
  });
  pdf.setTextColor(23, 35, 49);
  text(
    content.name || "Currículo",
    settings.template === "EDITORIAL" ? 24 : 20,
    true,
  );
  if (content.headline) text(content.headline, 12);
  for (const value of [
    content.email,
    content.phone,
    content.location,
    content.website,
  ].filter(Boolean)) {
    pdf.setFontSize(9);
    const lines: string[] = pdf.splitTextToSize(value, width);
    for (const line of lines) {
      ensure(lineHeight);
      if (value === content.website || value === content.email) {
        pdf.textWithLink(line, left, y, {
          url: value === content.email ? `mailto:${value}` : value,
        });
      } else pdf.text(line, left, y);
      y += lineHeight;
    }
  }
  y += 4;
  const labels =
    settings.language === "en"
      ? {
          summary: "Profile",
          skills: "Skills",
          EXPERIENCE: "Experience",
          EDUCATION: "Education",
          PROJECT: "Projects",
          CERTIFICATION: "Certifications",
        }
      : settings.language === "es"
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
  function heading(value: string) {
    ensure(18);
    y += 3;
    text(value, 11, true);
    if (settings.template === "EDITORIAL") {
      pdf.setDrawColor(170);
      pdf.line(left, y - 2, right, y - 2);
      y += 2;
    }
  }
  if (content.summary) {
    heading(labels.summary);
    text(content.summary);
  }
  if (content.skills.filter(Boolean).length) {
    heading(labels.skills);
    text(content.skills.filter(Boolean).join(" · "));
  }
  for (const entry of content.entries) {
    heading(`${labels[entry.type]} · ${entry.title}`);
    if (entry.organization || entry.period)
      text(
        [entry.organization, entry.period].filter(Boolean).join(" · "),
        9,
        true,
      );
    if (entry.description) text(entry.description);
    if (entry.url) {
      pdf.setFontSize(9);
      for (const line of pdf.splitTextToSize(entry.url, width) as string[]) {
        ensure(lineHeight);
        pdf.textWithLink(line, left, y, { url: entry.url });
        y += lineHeight;
      }
    }
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setFontSize(8);
    pdf.setTextColor(95);
    pdf.text(`${page} / ${pages}`, right, 287, { align: "right" });
  }
  return { pdf, pages, markdown: resumeMarkdown(content, settings.language) };
}

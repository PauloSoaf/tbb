export function slugifyPatientName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Remove consecutive hyphens
}

export function getPatientShortId(patientId: string): string {
  if (!patientId || patientId.length < 8) return patientId;
  return patientId.slice(-8);
}

export function buildPatientSlug(patient: { id: string; name: string }): string {
  const nameSlug = slugifyPatientName(patient.name);
  const shortId = getPatientShortId(patient.id);
  return `${nameSlug}-${shortId}`;
}

export function extractShortIdFromSlug(patientSlug: string): string | null {
  if (!patientSlug) return null;
  const parts = patientSlug.split("-");
  if (parts.length < 2) return patientSlug; // Might be raw ID
  return parts[parts.length - 1];
}

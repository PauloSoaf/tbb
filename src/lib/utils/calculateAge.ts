import { differenceInYears, parseISO } from "date-fns";

export function calculateAge(birthDate: Date | string): number {
  const date = typeof birthDate === "string" ? parseISO(birthDate) : birthDate;
  return differenceInYears(new Date(), date);
}

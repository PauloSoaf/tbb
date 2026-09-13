export function PatientSubstitutionBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] font-semibold text-brand-blue">
      {label}
    </span>
  );
}

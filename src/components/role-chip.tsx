import { Building2, Home, KeyRound, ShieldCheck, type LucideIcon } from "lucide-react";

const ROLE_ICONS: Record<string, LucideIcon> = {
  "Corredor(a)": Building2,
  "Arrendador(a)": Home,
  "Arrendatario(a)": KeyRound,
  "Administrador de plataforma": ShieldCheck,
};

export function RoleChip({ label }: { label: string }) {
  const Icon = ROLE_ICONS[label] ?? KeyRound;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary ring-1 ring-primary/15">
      <Icon className="size-4" strokeWidth={2} />
      {label}
    </span>
  );
}

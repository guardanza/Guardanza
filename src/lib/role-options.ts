import { Building2, User, Home, KeyRound } from "lucide-react";

export type RoleOptionRole = "arrendador" | "corredor" | "arrendatario";
export type RoleOptionLegalForm = "persona_natural" | "empresa" | "";
export type RoleOption = {
  role: RoleOptionRole;
  legalForm: RoleOptionLegalForm;
  title: string;
  description: string;
  icon: typeof Home;
};

// Shared by the signup wizard and /choose-role (post-login role pick for
// an account that authenticated with no role yet) — same four choices,
// same copy, so picking a role reads the same everywhere it's asked.
export const ROLE_OPTIONS: RoleOption[] = [
  { role: "arrendador", legalForm: "", title: "Arrendador", description: "Tengo una propiedad y la arriendo yo mismo.", icon: Home },
  {
    role: "corredor",
    legalForm: "persona_natural",
    title: "Corredor independiente",
    description: "Corredor de propiedades por cuenta propia.",
    icon: User,
  },
  {
    role: "corredor",
    legalForm: "empresa",
    title: "Oficina de corretaje",
    description: "Administro propiedades de varios clientes.",
    icon: Building2,
  },
  { role: "arrendatario", legalForm: "", title: "Arrendatario", description: "Estoy arrendando o buscando arriendo.", icon: KeyRound },
];

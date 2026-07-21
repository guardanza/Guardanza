import Link from "next/link";
import { redirect } from "next/navigation";
import { PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { CopyLinkButton } from "@/components/copy-link-button";

export default async function SignaturesPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("id, status, signed_at_landlord, signed_at_tenant, properties(address)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const SIGN_STATUS_LABEL: Record<string, string> = {
    pendiente_firma_arrendador: "Pendiente de firma del arrendador",
    pendiente_firma_arrendatario: "Pendiente de firma del arrendatario",
    pendiente_deposito: "Firmado, pendiente de depósito",
    activo: "Firmado y activo",
    en_disputa: "Firmado, en disputa",
    finalizado: "Firmado, finalizado",
    cancelado: "Cancelado",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Firmas</h1>
        <p className="text-sm text-muted-foreground">Estado de firma de cada propiedad. Comparte el link para que la otra parte firme.</p>
      </div>

      {contracts && contracts.length > 0 ? (
        <div className="space-y-3">
          {contracts.map((c) => {
            const property = one(c.properties);
            const pendingSignature = c.status === "pendiente_firma_arrendador" || c.status === "pendiente_firma_arrendatario";
            return (
              <Card key={c.id}>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link href={`/contracts/${c.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
                      {property?.address ?? c.id}
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      <span className="text-xs text-muted-foreground">{SIGN_STATUS_LABEL[c.status] ?? c.status}</span>
                    </div>
                  </div>
                  {pendingSignature && <CopyLinkButton path={`/contracts/${c.id}`} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <PenLine className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">Sin contratos todavía.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

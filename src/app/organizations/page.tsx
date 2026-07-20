import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { orgRoleLabel } from "@/lib/labels";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("role, organizations(id, name, type, org_code)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tus organizaciones</h1>
          <p className="text-sm text-muted-foreground">Empresas o cuentas individuales que administras.</p>
        </div>
        <Link href="/organizations/new" className={buttonVariants()}>
          + Nueva organización
        </Link>
      </div>

      <div className="space-y-3">
        {memberships?.map((m) => {
          const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
          if (!org) return null;
          return (
            <Card key={org.id}>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Link href={`/organizations/${org.id}`} className="font-medium underline-offset-4 hover:underline">
                    {org.name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline">{org.type === "broker" ? "Corredora" : "Arrendador individual"}</Badge>
                    <span>Tu rol: {orgRoleLabel(m.role)}</span>
                    <span>· Código: {org.org_code}</span>
                  </div>
                </div>
                <Link href={`/properties/new?organization_id=${org.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Nueva propiedad
                </Link>
              </CardContent>
            </Card>
          );
        })}
        {(!memberships || memberships.length === 0) && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No perteneces a ninguna organización todavía.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

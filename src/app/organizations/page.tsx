import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { orgRoleLabel, orgTypeLabel } from "@/lib/labels";
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
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Participantes</h1>
          <p className="text-sm text-muted-foreground">Arrendadores y corredoras que administras.</p>
        </div>
        <Link href="/organizations/new" className={buttonVariants()}>
          + Nuevo participante
        </Link>
      </div>

      <div className="space-y-3">
        {memberships?.map((m) => {
          const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
          if (!org) return null;
          return (
            <Card key={org.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Link href={`/organizations/${org.id}`} className="font-medium underline-offset-4 hover:underline">
                    {org.name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline">{orgTypeLabel(org.type)}</Badge>
                    <span>Tu rol: {orgRoleLabel(m.role)}</span>
                    <span>· Código: {org.org_code}</span>
                  </div>
                </div>
                <Link
                  href={`/properties/new?organization_id=${org.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm", className: "w-full sm:w-auto" })}
                >
                  Nueva propiedad
                </Link>
              </CardContent>
            </Card>
          );
        })}
        {(!memberships || memberships.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="size-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">No perteneces a ningún participante todavía.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

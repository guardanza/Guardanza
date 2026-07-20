import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("role, organizations(id, name, type)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tus organizaciones</h1>
        <Link href="/organizations/new" className="text-sm underline">
          + Nueva organización
        </Link>
      </div>
      <ul className="divide-y border">
        {memberships?.map((m) => {
          const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
          if (!org) return null;
          return (
            <li key={org.id} className="flex items-center justify-between p-3">
              <div>
                <Link href={`/organizations/${org.id}`} className="underline">
                  {org.name}
                </Link>{" "}
                <span className="text-sm text-gray-500">
                  ({org.type === "broker" ? "corredora" : "arrendador individual"} — tu rol: {m.role})
                </span>
              </div>
              <Link href={`/properties/new?organization_id=${org.id}`} className="text-sm underline">
                Nueva propiedad
              </Link>
            </li>
          );
        })}
        {(!memberships || memberships.length === 0) && (
          <li className="p-3 text-sm text-gray-500">No perteneces a ninguna organización todavía.</li>
        )}
      </ul>
    </div>
  );
}

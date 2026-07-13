import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("id, status, start_date, end_date, guarantee_amount, guarantee_currency, properties(address)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-xl font-semibold">Tus contratos</h1>
      <ul className="divide-y border">
        {contracts?.map((c) => (
          <li key={c.id} className="p-3">
            <Link href={`/contracts/${c.id}`} className="underline">
              {one(c.properties)?.address ?? c.id}
            </Link>{" "}
            — {c.status} — {c.guarantee_amount} {c.guarantee_currency}
          </li>
        ))}
        {contracts?.length === 0 && <li className="p-3 text-sm text-gray-500">Sin contratos todavía.</li>}
      </ul>
    </div>
  );
}

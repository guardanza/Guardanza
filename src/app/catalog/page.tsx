import { createClient } from "@/lib/supabase/server";
import { createRepairReference, updateRepairPrice } from "@/lib/actions/catalog";

export default async function CatalogPage() {
  const supabase = await createClient();

  const { data: references } = await supabase
    .from("repair_reference")
    .select("id, code, description, unit, repair_reference_versions(id, unit_price, valid_from, valid_to)")
    .order("code");

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-xl font-semibold">Catálogo de reparaciones (admin)</h1>

      <ul className="space-y-4">
        {references?.map((r) => {
          const versions = [...(r.repair_reference_versions ?? [])].sort(
            (a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
          );
          const current = versions.find((v) => v.valid_to === null);

          return (
            <li key={r.id} className="space-y-2 border p-3">
              <p>
                <strong>{r.code}</strong> — {r.description} ({r.unit}) — vigente: {current?.unit_price ?? "—"}
              </p>
              <details>
                <summary className="cursor-pointer text-sm underline">Historial de versiones</summary>
                <ul className="list-disc pl-5 text-sm">
                  {versions.map((v) => (
                    <li key={v.id}>
                      {v.unit_price} — desde {v.valid_from} {v.valid_to ? `hasta ${v.valid_to}` : "(vigente)"}
                    </li>
                  ))}
                </ul>
              </details>
              <form action={updateRepairPrice} className="flex gap-2">
                <input type="hidden" name="repair_reference_id" value={r.id} />
                <input name="unit_price" type="number" step="0.01" placeholder="Nuevo precio" required className="border p-1" />
                <button type="submit" className="border border-black px-2 text-sm">
                  Actualizar precio (cierra vigencia anterior)
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      <form action={createRepairReference} className="space-y-2 border p-4">
        <h2 className="font-medium">Nuevo tipo de reparación</h2>
        <input name="code" placeholder="Código" required className="w-full border p-2" />
        <input name="description" placeholder="Descripción" required className="w-full border p-2" />
        <input name="unit" placeholder="Unidad (m2, unidad, hora)" required className="w-full border p-2" />
        <input name="unit_price" type="number" step="0.01" placeholder="Precio" required className="w-full border p-2" />
        <button type="submit" className="bg-black p-2 text-white">
          Crear
        </button>
      </form>
    </div>
  );
}

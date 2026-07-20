import { createProperty } from "@/lib/actions/properties";

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ organization_id?: string; error?: string }>;
}) {
  const { organization_id, error } = await searchParams;

  return (
    <form action={createProperty} className="mx-auto max-w-md space-y-2 p-8">
      <h1 className="text-xl font-semibold">Nueva propiedad</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input type="hidden" name="organization_id" defaultValue={organization_id} />
      <input name="address" placeholder="Dirección" required className="w-full border p-2" />
      <input name="comuna" placeholder="Comuna" className="w-full border p-2" />
      <label className="block text-sm">Código de organización corredora (opcional)</label>
      <input
        name="broker_org_code"
        placeholder="Ej: 384021 — te lo comparte la corredora"
        className="w-full border p-2"
      />
      <button type="submit" className="bg-black p-2 text-white">
        Crear
      </button>
    </form>
  );
}

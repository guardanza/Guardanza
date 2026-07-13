import { createProperty } from "@/lib/actions/properties";

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ organization_id?: string }>;
}) {
  const { organization_id } = await searchParams;

  return (
    <form action={createProperty} className="mx-auto max-w-md space-y-2 p-8">
      <h1 className="text-xl font-semibold">Nueva propiedad</h1>
      <input type="hidden" name="organization_id" defaultValue={organization_id} />
      <input name="address" placeholder="Dirección" required className="w-full border p-2" />
      <input name="comuna" placeholder="Comuna" className="w-full border p-2" />
      <input
        name="broker_organization_id"
        placeholder="ID organización corredora (opcional)"
        className="w-full border p-2"
      />
      <button type="submit" className="bg-black p-2 text-white">
        Crear
      </button>
    </form>
  );
}

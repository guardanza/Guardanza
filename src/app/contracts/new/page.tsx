import { createContract } from "@/lib/actions/contracts";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string }>;
}) {
  const { property_id } = await searchParams;

  return (
    <form action={createContract} className="mx-auto max-w-md space-y-2 p-8">
      <h1 className="text-xl font-semibold">Nuevo contrato</h1>
      <input type="hidden" name="property_id" defaultValue={property_id} />

      <label className="block text-sm">Arrendatario (email, debe tener cuenta ya creada)</label>
      <input name="tenant_email" type="email" required className="w-full border p-2" />

      <label className="block text-sm">Vigencia</label>
      <div className="flex gap-2">
        <input name="start_date" type="date" required className="w-full border p-2" />
        <input name="end_date" type="date" required className="w-full border p-2" />
      </div>

      <label className="block text-sm">Renta</label>
      <div className="flex gap-2">
        <input name="rent_amount" type="number" step="0.01" required className="w-full border p-2" />
        <select name="rent_currency" required className="w-full border p-2">
          <option value="CLP">CLP</option>
          <option value="UF">UF</option>
        </select>
      </div>

      <label className="block text-sm">Garantía</label>
      <div className="flex gap-2">
        <input name="guarantee_amount" type="number" step="0.01" required className="w-full border p-2" />
        <select name="guarantee_currency" required className="w-full border p-2">
          <option value="CLP">CLP</option>
          <option value="UF">UF</option>
        </select>
      </div>

      <button type="submit" className="bg-black p-2 text-white">
        Crear contrato (borrador)
      </button>
    </form>
  );
}

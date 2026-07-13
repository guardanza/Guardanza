import { createOrganization } from "@/lib/actions/organizations";

export default function NewOrganizationPage() {
  return (
    <form action={createOrganization} className="mx-auto max-w-md space-y-2 p-8">
      <h1 className="text-xl font-semibold">Nueva organización</h1>
      <select name="type" required className="w-full border p-2">
        <option value="individual">Arrendador individual</option>
        <option value="broker">Corredora</option>
      </select>
      <input name="name" placeholder="Nombre" required className="w-full border p-2" />
      <button type="submit" className="bg-black p-2 text-white">
        Crear
      </button>
    </form>
  );
}

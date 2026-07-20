import { signIn, signUp } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm space-y-8 p-8">
      <h1 className="text-xl font-semibold">Guardanza — Fase A (demo simulado)</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <form action={signIn} className="space-y-2 border p-4">
        <h2 className="font-medium">Iniciar sesión</h2>
        <input name="email" type="email" placeholder="Email" required className="w-full border p-2" />
        <input name="password" type="password" placeholder="Contraseña" required className="w-full border p-2" />
        <button type="submit" className="w-full bg-black p-2 text-white">
          Entrar
        </button>
      </form>

      <form action={signUp} className="space-y-2 border p-4">
        <h2 className="font-medium">Crear cuenta</h2>
        <input name="full_name" placeholder="Nombre completo" required className="w-full border p-2" />
        <input name="email" type="email" placeholder="Email" required className="w-full border p-2" />
        <input name="password" type="password" placeholder="Contraseña" required minLength={6} className="w-full border p-2" />
        <button type="submit" className="w-full border border-black p-2">
          Registrarme
        </button>
      </form>
    </div>
  );
}

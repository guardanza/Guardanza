"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p className="text-sm text-red-600">{error.message || "Ocurrió un error inesperado."}</p>
      <button onClick={() => reset()} className="bg-black p-2 text-white">
        Reintentar
      </button>
    </div>
  );
}

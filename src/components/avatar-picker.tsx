"use client";

import { useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Camera, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { processAvatarImage } from "@/lib/image-processing";
import { uploadAvatar, deleteAvatar } from "@/lib/actions/avatar";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";

function ConfirmDeleteAvatarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Eliminando…
        </>
      ) : (
        "Eliminar foto"
      )}
    </Button>
  );
}

export function AvatarPicker({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the user re-pick the same file later
    if (!file) return;
    setError(null);
    try {
      const blob = await processAvatarImage(file);
      const formData = new FormData();
      formData.set("avatar", blob, "avatar.webp");
      startTransition(() => {
        uploadAvatar(formData);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar la imagen.");
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="group relative shrink-0">
        {pending ? (
          <div className="flex size-20 items-center justify-center rounded-full bg-muted">
            <Loader2 className="size-6 animate-spin text-muted-foreground" strokeWidth={2} />
          </div>
        ) : (
          <UserAvatar avatarUrl={avatarUrl} name={name} size={80} />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          aria-label="Cambiar foto"
          className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/0 text-transparent transition-all duration-200 group-hover:bg-black/50 group-hover:text-white disabled:pointer-events-none"
        >
          <Camera className="size-4" strokeWidth={2} />
          <span className="text-[10px] leading-none font-medium">Cambiar foto</span>
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      <div className="space-y-1">
        {pending ? (
          // Las fotos a veces pesan y demoran en subir — este texto es
          // deliberadamente más visible que el spinner del círculo solo,
          // para que quede claro que algo está pasando y no hace falta
          // volver a tocar nada mientras se espera.
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
            Cargando…
          </p>
        ) : (
          <>
            <button type="button" onClick={() => inputRef.current?.click()} className="block text-sm font-medium text-primary hover:underline">
              Cambiar foto
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="block text-xs text-muted-foreground hover:text-destructive hover:underline"
              >
                Eliminar foto
              </button>
            )}
          </>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <BottomSheet open={confirmOpen} onOpenChange={setConfirmOpen}>
        <BottomSheetContent>
          <form action={deleteAvatar} className="space-y-3">
            <BottomSheetHeader>
              <BottomSheetTitle>¿Eliminar tu foto de perfil?</BottomSheetTitle>
              <BottomSheetDescription>Vuelves a mostrar tus iniciales en vez de una foto.</BottomSheetDescription>
            </BottomSheetHeader>
            <BottomSheetFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancelar
              </Button>
              <ConfirmDeleteAvatarButton />
            </BottomSheetFooter>
          </form>
        </BottomSheetContent>
      </BottomSheet>
    </div>
  );
}

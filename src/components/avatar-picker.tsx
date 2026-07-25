"use client";

import { useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { processAvatarImage } from "@/lib/image-processing";
import { uploadAvatar, deleteAvatar } from "@/lib/actions/avatar";

export function AvatarPicker({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        {pending ? <div className="size-20 animate-shimmer rounded-full" /> : <UserAvatar avatarUrl={avatarUrl} name={name} size={80} />}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          aria-label="Cambiar foto"
          className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/0 text-transparent transition-all duration-200 group-hover:bg-black/50 group-hover:text-white"
        >
          <Camera className="size-4" strokeWidth={2} />
          <span className="text-[10px] leading-none font-medium">Cambiar foto</span>
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="block text-sm font-medium text-primary hover:underline"
        >
          Cambiar foto
        </button>
        {avatarUrl && (
          <form action={deleteAvatar}>
            <button type="submit" className="block text-xs text-muted-foreground hover:text-destructive hover:underline">
              Eliminar foto
            </button>
          </form>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

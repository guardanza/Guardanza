"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { PropertyThumb } from "@/components/property-thumb";

// The file input lives visually on top of the photo it controls — a small
// pill button in the corner — instead of a separate "Reemplazar foto"
// field disconnected from the thumbnail further down the form. Shows a
// live local preview of whatever was just picked, so the user sees the
// actual photo they're about to save, not just a filename.
export function PropertyPhotoField({ photoUrl }: { photoUrl: string | null }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <div className="relative">
      <PropertyThumb url={previewUrl ?? photoUrl} className="h-36 w-full rounded-lg" />
      <label
        htmlFor="photo"
        className="absolute right-2 bottom-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-border backdrop-blur-sm transition-colors hover:bg-background"
      >
        <Camera className="size-3.5" strokeWidth={2} />
        {photoUrl || previewUrl ? "Cambiar foto" : "Agregar foto"}
      </label>
      <input
        id="photo"
        name="photo"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setPreviewUrl(URL.createObjectURL(file));
        }}
      />
    </div>
  );
}

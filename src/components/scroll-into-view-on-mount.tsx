"use client";

import { useEffect } from "react";

// Mismo espíritu que rutHighlighted en profile-form.tsx: al llegar con
// el parámetro de foco, se hace scroll hacia la sección relevante — acá
// como componente invisible aparte porque el destino (la Card de
// candidatos) es parte de una página server component grande, sin
// convertirla entera a cliente solo por este efecto.
export function ScrollIntoViewOnMount({ targetId, when }: { targetId: string; when: boolean }) {
  useEffect(() => {
    if (when) document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [targetId, when]);
  return null;
}

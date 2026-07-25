"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// useFormStatus only works inside the <form> it belongs to, so this can't
// just be a plain <Button type="submit">Guardar</Button> — it has to be its
// own component rendered as a child of the form.
export function SaveButton({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className={className}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Guardando…
        </>
      ) : (
        children
      )}
    </Button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const COOLDOWN_SECONDS = 60;

// sentAt is a timestamp carried through the redirect (?sent=<ms>) rather
// than client-side state, since the form submission is a full page
// navigation — there's no in-memory state to persist across it.
export function ResendCooldownButton({ sentAt, children }: { sentAt: number | null; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  const [remaining, setRemaining] = useState(() => (sentAt ? Math.ceil((sentAt + COOLDOWN_SECONDS * 1000 - Date.now()) / 1000) : 0));

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  const onCooldown = remaining > 0;

  return (
    <Button type="submit" disabled={pending || onCooldown} className="w-full">
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Enviando…
        </>
      ) : onCooldown ? (
        `Reenviar en ${remaining}s`
      ) : (
        children
      )}
    </Button>
  );
}

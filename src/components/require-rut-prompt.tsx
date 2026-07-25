import Link from "next/link";
import { IdCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

// Blocking prompt shown in place of a sign/create-contract action when the
// user hasn't completed their RUT yet. Not a JS modal overlay — a plain
// Card works without client JS, needs no focus-trap handling, and reads
// just as clearly as an interruption at the exact point the user hit the
// wall, which is what the underlying requirement actually calls for.
export function RequireRutPrompt({ returnTo }: { returnTo: string }) {
  return (
    <Card className="border-brand-gold/40 bg-brand-gold/5">
      <CardContent className="flex items-start gap-3">
        <IdCard className="mt-0.5 size-5 shrink-0 text-brand-gold" strokeWidth={2} />
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Para continuar, necesitas completar tu RUT</p>
          <p className="text-xs text-muted-foreground">
            Es obligatorio para firmar o crear contratos, aunque no lo pedimos al registrarte.
          </p>
          <Link
            href={`/profile?next=${encodeURIComponent(returnTo)}&highlight=rut`}
            className={buttonVariants({ size: "sm" })}
          >
            Completar ahora
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

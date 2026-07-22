"use client";

import { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { signIn, signInWithGoogle } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Email/password stays collapsed behind an explicit choice — Google is the
// fast path, email is for anyone who'd rather not use it. Starts expanded
// when there's already a login error to show (redirected back from a
// failed email attempt), so the user isn't stuck looking at a collapsed
// form they just submitted.
export function LoginForm({ startExpanded = false }: { startExpanded?: boolean }) {
  const [showEmailForm, setShowEmailForm] = useState(startExpanded);

  return (
    <div className="space-y-3">
      <form action={signInWithGoogle}>
        <Button type="submit" className="w-full">
          Continuar con Google
        </Button>
      </form>

      {!showEmailForm && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />O<div className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={() => setShowEmailForm(true)}>
            <Mail /> Continuar con Email
          </Button>
        </>
      )}

      {showEmailForm && (
        <form action={signIn} className="animate-fade-in-up space-y-3 border-t pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="signin-email">Email</Label>
            <Input id="signin-email" name="email" type="email" required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signin-password">Contraseña</Label>
            <Input id="signin-password" name="password" type="password" required />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon" onClick={() => setShowEmailForm(false)} aria-label="Atrás">
              <ArrowLeft />
            </Button>
            <Button type="submit" className="flex-1">
              Iniciar sesión
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

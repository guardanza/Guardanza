"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { SaveButton } from "@/components/save-button";
import { PasswordStrength } from "@/components/password-strength";

export function NewPasswordForm({ action }: { action: (formData: FormData) => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="new_password">Nueva contraseña</Label>
        <PasswordInput
          id="new_password"
          name="new_password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          required
          autoFocus
        />
        <PasswordStrength password={newPassword} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm_password">Confirmar nueva contraseña</Label>
        <PasswordInput
          id="confirm_password"
          name="confirm_password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          aria-invalid={mismatch}
          required
        />
        {mismatch && <p className="text-xs text-destructive">Las contraseñas no coinciden.</p>}
      </div>
      <SaveButton disabled={mismatch} className="w-full">
        Guardar contraseña
      </SaveButton>
    </form>
  );
}

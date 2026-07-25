"use client";

// 0 = too short, 1 = meets length but missing upper/number, 2 = meets
// length + one of the two, 3 = meets the full rule (matches the actual
// server-side check in changePassword / signUpWithRole).
function strengthOf(password: string): 0 | 1 | 2 | 3 {
  if (password.length < 8) return 0;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (hasUpper && hasNumber) return 3;
  if (hasUpper || hasNumber) return 2;
  return 1;
}

const STYLES = {
  0: { width: "10%", className: "bg-destructive" },
  1: { width: "40%", className: "bg-destructive" },
  2: { width: "70%", className: "bg-brand-gold" },
  3: { width: "100%", className: "bg-success" },
} as const;

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const strength = strengthOf(password);
  const { width, className } = STYLES[strength];

  return (
    <div className="space-y-1">
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all duration-200 ${className}`} style={{ width }} />
      </div>
      <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, una mayúscula y un número.</p>
    </div>
  );
}

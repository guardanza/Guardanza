"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import type { RoleBucket } from "@/lib/role-bucket";

const ROLE_OPTIONS: { value: RoleBucket; label: string }[] = [
  { value: "arrendador", label: "Arrendador" },
  { value: "arrendatario", label: "Arrendatario" },
  { value: "corredor", label: "Corredor" },
];

// Invitar desde Mis Contactos, con el rol elegido a conciencia — antes
// "Invitar" mandaba directo con el rol de la pestaña activa, sin que
// quedara claro con cuál. Una cuenta tiene un solo rol (cambiarlo
// después es costoso), así que acá se elige explícito en un bottom
// sheet — ninguno preseleccionado a propósito, ni siquiera el de la
// pestaña activa. Reusa quickInviteContact tal cual (mismo campo "tab"
// que ya lee, ahora puesto por la persona en vez de heredado).
//
// Sin `email` fijo (búsqueda por nombre/RUT sin resultados), el campo de
// email vive dentro de este mismo componente — así se puede validar y
// leer su valor antes de abrir el sheet, sin depender de otro estado.
export function QuickInviteButton({
  action,
  email: fixedEmail,
  buttonLabel = "Invitar",
}: {
  action: (formData: FormData) => void;
  email?: string;
  buttonLabel?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(fixedEmail ?? "");
  const [role, setRole] = useState<RoleBucket | null>(null);

  useEffect(() => {
    if (role) formRef.current?.requestSubmit();
  }, [role]);

  function handleOpen() {
    if (!formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      return;
    }
    setOpen(true);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setRole(null);
  }

  return (
    <>
      <form ref={formRef} action={action} className={fixedEmail ? undefined : "flex flex-col gap-2 sm:flex-row"}>
        <input type="hidden" name="tab" value={role ?? ""} />
        {fixedEmail ? (
          <input type="hidden" name="email" value={fixedEmail} />
        ) : (
          <Input
            name="email"
            type="email"
            placeholder="email@ejemplo.cl"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sm:max-w-xs"
          />
        )}
        <Button type="button" size="sm" onClick={handleOpen}>
          {buttonLabel}
        </Button>
      </form>
      <BottomSheet open={open} onOpenChange={handleOpenChange}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>¿Con qué rol invitas?</BottomSheetTitle>
            <BottomSheetDescription>
              Elige el rol con el que se va a registrar <span className="break-all">{email}</span>.
            </BottomSheetDescription>
          </BottomSheetHeader>
          <div className="grid gap-2 py-1">
            {ROLE_OPTIONS.map((r) => (
              <Button key={r.value} type="button" variant="outline" disabled={role !== null} onClick={() => setRole(r.value)}>
                {r.label}
              </Button>
            ))}
          </div>
          <BottomSheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}

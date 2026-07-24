"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { GATE_COOKIE_NAME, gateTokenFor } from "@/lib/gate";

export async function unlockGate(formData: FormData) {
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  const expected = process.env.GATE_PASSWORD;
  if (!expected || password !== expected) {
    redirect(`/gate?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Clave incorrecta.")}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(GATE_COOKIE_NAME, gateTokenFor(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 days — this is a soft "keep it private while in progress" gate, not account security
  });

  redirect(next || "/");
}

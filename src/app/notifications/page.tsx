import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateNotificationPreferences } from "@/lib/actions/notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CATEGORIES: { key: string; label: string; hint: string }[] = [
  { key: "contract_signed", label: "Contrato firmado", hint: "Cuando se firma un contrato en el que participas" },
  { key: "guarantee_paid", label: "Garantía pagada", hint: "Cuando se paga la garantía de uno de tus contratos" },
  { key: "dispute_opened", label: "Disputa abierta", hint: "Cuando se abre una propuesta de arreglo" },
  { key: "proposal_received", label: "Propuesta recibida", hint: "Cuando la otra parte envía o contrapropone" },
];

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userRes.user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Notificaciones</h1>
        <p className="text-sm text-muted-foreground">
          Elige cómo te avisamos. Por ahora esto guarda tu preferencia — el envío real por email/WhatsApp llega después.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferencias</CardTitle>
          <CardDescription>Activa o desactiva cada canal por tipo de evento.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateNotificationPreferences} className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-3 border-b pb-3 text-xs font-medium text-muted-foreground">
              <span />
              <span className="text-center">Email</span>
              <span className="text-center">WhatsApp</span>
            </div>
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1 border-b py-3 last:border-b-0">
                <div>
                  <p className="text-sm font-medium">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.hint}</p>
                </div>
                <input
                  type="checkbox"
                  name={`${cat.key}_email`}
                  defaultChecked={prefs ? Boolean(prefs[`${cat.key}_email`]) : true}
                  className="size-4 justify-self-center accent-primary"
                />
                <input
                  type="checkbox"
                  name={`${cat.key}_whatsapp`}
                  defaultChecked={prefs ? Boolean(prefs[`${cat.key}_whatsapp`]) : false}
                  className="size-4 justify-self-center accent-primary"
                />
              </div>
            ))}
            <Button type="submit" className="mt-4 w-full">
              Guardar preferencias
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Cierre mínimo de esta etapa (Etapa 2): la cuenta quedó creada y
// confirmada en la postulación, pero el flujo guiado real (bienvenida →
// identidad → documentos → confirmación) todavía no existe — llega en
// la Etapa 3. Mensaje honesto sobre eso, no un flujo simulado.
export default function CandidateParticipantLinkedPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Quedaste vinculado a esta postulación</CardTitle>
          <CardDescription>
            Ya puedes iniciar sesión con tu cuenta nueva. La presentación de tus documentos vive en el siguiente
            paso, que todavía no está disponible — te avisamos apenas lo esté.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

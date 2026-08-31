import { saveCandidateIncomeType } from "@/lib/actions/candidate-evaluation";
import { INCOME_TYPES, INCOME_TYPE_LABELS } from "@/lib/candidate-documents";
import { Button } from "@/components/ui/button";

// Pantalla 3 (tipo de ingreso) — spec sección 5: "se pregunta antes;
// nunca lista genérica". Server component puro: radios nativos con
// selección visual por CSS (peer-checked), sin JS — el submit real es
// la Server Action de siempre.
export function IncomeTypeScreen({ candidateParticipantId }: { candidateParticipantId: string }) {
  return (
    <form action={saveCandidateIncomeType} className="space-y-4">
      <input type="hidden" name="candidate_participant_id" value={candidateParticipantId} />
      <p className="text-sm text-muted-foreground">¿Cuál describe mejor tu situación laboral?</p>
      <div className="space-y-2">
        {INCOME_TYPES.map((type) => (
          <label
            key={type}
            className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-medium transition-colors has-checked:border-primary has-checked:bg-primary/5"
          >
            <input type="radio" name="income_type" value={type} required className="size-4 accent-primary" />
            {INCOME_TYPE_LABELS[type]}
          </label>
        ))}
      </div>
      <Button type="submit" className="w-full">
        Continuar
      </Button>
    </form>
  );
}

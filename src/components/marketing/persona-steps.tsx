export function PersonaSteps({ title, items }: { title: string; items: { title: string; detail: string }[] }) {
  return (
    <div className="border-y bg-card">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight">{title}</h2>
        <div className="mt-8 space-y-0">
          {items.map((s, i) => (
            <div key={s.title} className={`flex gap-4 py-4 ${i !== items.length - 1 ? "border-b" : ""}`}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

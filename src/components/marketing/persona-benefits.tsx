import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PersonaBenefits({
  title,
  items,
}: {
  title: string;
  items: { icon: LucideIcon; title: string; description: string }[];
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h2 className="text-center text-3xl">{title}</h2>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardContent className="space-y-2">
                <Icon className="size-6 text-primary" strokeWidth={2} />
                <p className="font-bold text-primary">{item.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

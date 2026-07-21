"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        const url = `${window.location.origin}${path}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check /> : <Link2 />}
      {copied ? "Copiado" : "Copiar link"}
    </Button>
  );
}

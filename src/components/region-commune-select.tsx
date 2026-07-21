"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Region = { id: string; name: string; communes: { id: string; name: string }[] };

export function RegionCommuneSelect({
  regions,
  defaultCommuneId,
}: {
  regions: Region[];
  defaultCommuneId?: string | null;
}) {
  const initialRegion = regions.find((r) => r.communes.some((c) => c.id === defaultCommuneId));
  const [regionId, setRegionId] = useState(initialRegion?.id ?? "");
  const communes = regions.find((r) => r.id === regionId)?.communes ?? [];

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="region">Región</Label>
        <select
          id="region"
          className={selectClass}
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
        >
          <option value="">Selecciona una región</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="commune_id">Comuna</Label>
        <select id="commune_id" name="commune_id" required disabled={!regionId} className={selectClass} defaultValue={defaultCommuneId ?? ""}>
          <option value="">{regionId ? "Selecciona una comuna" : "Elige región primero"}</option>
          {communes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

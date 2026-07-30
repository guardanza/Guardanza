"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { digitsOnly, formatMoneyInputDisplay, type MoneyCurrency } from "@/lib/money";

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Paired amount+currency editor for money fields (expected_rent,
// expected_guarantee, etc.): $ prefix, thousand separators, no spinner
// arrows (it's a text input under the hood, not type=number — spinners
// don't make sense for money). CLP/UF decide whether decimals are even
// allowed — switching currency reformats live instead of leaving a value
// the new currency wouldn't actually support (e.g. "1.250,50" surviving a
// switch to CLP, which has no decimals).
export function MoneyAmountInput({
  amountName,
  currencyName,
  defaultAmount,
  defaultCurrency = "CLP",
}: {
  amountName: string;
  currencyName: string;
  defaultAmount?: number | string | null;
  defaultCurrency?: MoneyCurrency;
}) {
  const [currency, setCurrency] = useState<MoneyCurrency>(defaultCurrency);
  const allowDecimals = currency === "UF";
  const [raw, setRaw] = useState(defaultAmount !== null && defaultAmount !== undefined && defaultAmount !== "" ? String(defaultAmount) : "");

  function handleCurrencyChange(next: MoneyCurrency) {
    setCurrency(next);
    if (next === "CLP" && raw.includes(".")) setRaw(raw.split(".")[0]);
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
        <Input
          type="text"
          inputMode="decimal"
          value={formatMoneyInputDisplay(raw, allowDecimals)}
          onChange={(e) => setRaw(digitsOnly(e.target.value, allowDecimals))}
          className="pl-6"
        />
        <input type="hidden" name={amountName} value={raw} />
      </div>
      <select
        name={currencyName}
        value={currency}
        onChange={(e) => handleCurrencyChange(e.target.value as MoneyCurrency)}
        className={selectClass}
      >
        <option value="CLP">CLP</option>
        <option value="UF">UF</option>
      </select>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { UNKNOWN_DAY_PLACEHOLDER, parseSheetDate } from "@/lib/format/date";

interface DateInputProps {
  id?: string;
  value: string; // "dd/MM/yyyy" or "xx/MM/yyyy"
  onChange: (value: string) => void;
  /** Fallback month/year (numeric "MM"/"yyyy") used when the field is still empty, e.g. the month page currently open. */
  defaultMonth: string;
  defaultYear: string;
}

/** Sheet dates can be "day not yet known" (the "xx/MM/yyyy" placeholder) — this input toggles between a normal date picker and that placeholder form. */
export function DateInput({ id, value, onChange, defaultMonth, defaultYear }: DateInputProps) {
  const parsed = useMemo(() => parseSheetDate(value) ?? { dayKnown: true, day: "", month: defaultMonth, year: defaultYear }, [value, defaultMonth, defaultYear]);

  const isoValue =
    parsed.dayKnown && parsed.day && parsed.month && parsed.year
      ? `${parsed.year}-${parsed.month}-${parsed.day}`
      : "";

  return (
    <div className="flex flex-col gap-2">
      {parsed.dayKnown ? (
        <Input
          id={id}
          type="date"
          className="h-11 text-base"
          value={isoValue}
          onChange={(event) => {
            const [year, month, day] = event.target.value.split("-");
            if (!year) return;
            onChange(`${day}/${month}/${year}`);
          }}
        />
      ) : (
        <div className="flex gap-2">
          <Input
            aria-label="Mês"
            type="number"
            min={1}
            max={12}
            className="h-11 w-20 text-base"
            value={Number(parsed.month)}
            onChange={(event) => {
              const month = event.target.value.padStart(2, "0");
              onChange(`${UNKNOWN_DAY_PLACEHOLDER}/${month}/${parsed.year}`);
            }}
          />
          <Input
            aria-label="Ano"
            type="number"
            className="h-11 w-28 text-base"
            value={Number(parsed.year)}
            onChange={(event) => {
              onChange(`${UNKNOWN_DAY_PLACEHOLDER}/${parsed.month}/${event.target.value}`);
            }}
          />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={!parsed.dayKnown}
          onCheckedChange={(checked) => {
            if (checked) {
              onChange(`${UNKNOWN_DAY_PLACEHOLDER}/${parsed.month || defaultMonth}/${parsed.year || defaultYear}`);
            } else {
              onChange(`01/${parsed.month || defaultMonth}/${parsed.year || defaultYear}`);
            }
          }}
        />
        Dia ainda não definido
      </label>
    </div>
  );
}

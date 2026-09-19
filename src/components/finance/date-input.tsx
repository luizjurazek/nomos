"use client";

import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { UNKNOWN_DAY_PLACEHOLDER, isRealCalendarDate, maskDateInput, parseSheetDate } from "@/lib/format/date";

interface DateInputProps {
  id?: string;
  value: string; // "dd/MM/yyyy" or "xx/MM/yyyy"
  onChange: (value: string) => void;
  /** Fallback month/year (numeric "MM"/"yyyy") used when the field is still empty, e.g. the month page currently open. */
  defaultMonth: string;
  defaultYear: string;
}

/**
 * Sheet dates can be "day not yet known" (the "xx/MM/yyyy" placeholder) — this input toggles between a typed date
 * and that placeholder form. The date is typed as "dd/mm/aaaa" (a native date input shows the device's regional
 * order instead, e.g. mm/dd on a US-region phone); the calendar button still opens the native picker.
 */
export function DateInput({ id, value, onChange, defaultMonth, defaultYear }: DateInputProps) {
  const parsed = useMemo(() => parseSheetDate(value) ?? { dayKnown: true, day: "", month: defaultMonth, year: defaultYear }, [value, defaultMonth, defaultYear]);
  // What is on screen while typing; the form only holds a usable date once this is complete and real.
  const [draft, setDraft] = useState(() => (parseSheetDate(value)?.dayKnown ? value : ""));

  const typedDate = isRealCalendarDate(draft) ? draft : "";
  const isoValue = typedDate ? typedDate.split("/").reverse().join("-") : "";
  const complete = draft.length === 10;

  const setTyped = (next: string) => {
    setDraft(next);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {parsed.dayKnown ? (
        <div className="relative">
          <Input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="dd/mm/aaaa"
            maxLength={10}
            className="h-11 pr-12 text-base"
            value={draft}
            aria-invalid={complete && !typedDate}
            onChange={(event) => setTyped(maskDateInput(event.target.value))}
          />
          {/* The transparent native date input sits on top of the icon, so tapping it opens the platform picker. */}
          <div className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-foreground-secondary">
            <CalendarDays className="size-5" />
            <input
              type="date"
              tabIndex={-1}
              aria-label="Escolher no calendário"
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              value={isoValue}
              onChange={(event) => {
                const [year, month, day] = event.target.value.split("-");
                if (year) setTyped(`${day}/${month}/${year}`);
              }}
            />
          </div>
        </div>
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
      <label className="flex min-h-12 items-center gap-3 text-sm text-muted-foreground max-sm:text-base">
        <Checkbox
          className="max-sm:size-6 max-sm:[&_svg]:size-5!"
          checked={!parsed.dayKnown}
          onCheckedChange={(checked) => {
            if (checked) {
              onChange(`${UNKNOWN_DAY_PLACEHOLDER}/${parsed.month || defaultMonth}/${parsed.year || defaultYear}`);
            } else {
              setTyped(`01/${parsed.month || defaultMonth}/${parsed.year || defaultYear}`);
            }
          }}
        />
        Dia ainda não definido
      </label>
    </div>
  );
}

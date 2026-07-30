"use client";

import { useMemo, useState } from "react";
import {
  canberraSelectionToIso,
  formatCanberraDateTime,
  parseCanberraSelectorDefault,
  type CanberraPeriod,
} from "@/lib/utils/canberra-time";

type CanberraDateTimeSelectorProps = {
  defaultValue?: string | null;
  label: string;
  name: string;
  required?: boolean;
};

const hours = Array.from({ length: 12 }, (_, index) => index + 1);
const minutes = Array.from({ length: 12 }, (_, index) => index * 5);
const periods: CanberraPeriod[] = ["AM", "PM"];

export function CanberraDateTimeSelector({ defaultValue, label, name, required = false }: CanberraDateTimeSelectorProps) {
  const parsedDefault = parseCanberraSelectorDefault(defaultValue);
  const [date, setDate] = useState(parsedDefault?.date ?? "");
  const [hour, setHour] = useState(parsedDefault?.hour ?? 9);
  const [minute, setMinute] = useState(parsedDefault?.minute ?? 0);
  const [period, setPeriod] = useState<CanberraPeriod>(parsedDefault?.period ?? "AM");

  const value = useMemo(() => {
    if (!date) return "";
    return canberraSelectionToIso({ date, hour, minute, period });
  }, [date, hour, minute, period]);

  return (
    <div className="field">
      <label>{label}</label>
      <input name={name} required={required} type="hidden" value={value} />
      <div className="canberra-datetime-selector">
        <input
          aria-label={`${label} date`}
          onChange={(event) => setDate(event.target.value)}
          required={required}
          type="date"
          value={date}
        />
        <select aria-label={`${label} hour`} onChange={(event) => setHour(Number(event.target.value))} value={hour}>
          {hours.map((option) => <option value={option} key={option}>{option}</option>)}
        </select>
        <select aria-label={`${label} minute`} onChange={(event) => setMinute(Number(event.target.value))} value={minute}>
          {minutes.map((option) => <option value={option} key={option}>{String(option).padStart(2, "0")}</option>)}
        </select>
        <select aria-label={`${label} AM or PM`} onChange={(event) => setPeriod(event.target.value as CanberraPeriod)} value={period}>
          {periods.map((option) => <option value={option} key={option}>{option}</option>)}
        </select>
      </div>
      <p className="muted">Canberra time</p>
      <p className="datetime-preview">
        {value ? `Selected: ${formatCanberraDateTime(value)} Canberra time` : "Select a date and time."}
      </p>
    </div>
  );
}

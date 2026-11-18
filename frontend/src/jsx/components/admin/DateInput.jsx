import { useEffect, useRef, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");

export function toDisplayDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function toIso(text) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function problem(raw, iso, min, max) {
  if (raw.trim() && !iso) return "Enter the date as dd/mm/yyyy.";
  if (iso && min && iso < min) return `Choose ${toDisplayDate(min)} or later.`;
  if (iso && max && iso > max) return `Choose ${toDisplayDate(max)} or earlier.`;
  return "";
}

export default function DateInput({ value, onChange, min, max, required, id, className = "" }) {
  const [text, setText] = useState(toDisplayDate(value));
  const textRef = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    setText((current) => (toIso(current) === value ? current : toDisplayDate(value)));
  }, [value]);

  useEffect(() => {
    textRef.current?.setCustomValidity(problem(text, toIso(text), min, max));
  }, [text, min, max]);

  function handleText(event) {
    const raw = event.target.value;
    setText(raw);
    const iso = toIso(raw);
    if (iso && iso !== value) onChange(iso);
    if (!raw.trim() && value) onChange("");
  }

  function handleBlur() {
    const iso = toIso(text);
    if (iso) setText(toDisplayDate(iso));
  }

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      picker.focus();
    }
  }

  function handlePicked(event) {
    const iso = event.target.value;
    setText(toDisplayDate(iso));
    onChange(iso);
    textRef.current?.focus();
  }

  return (
    <span className={`date-input ${className}`.trim()}>
      <input
        ref={textRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/yyyy"
        value={text}
        onChange={handleText}
        onBlur={handleBlur}
        required={required}
      />
      <button type="button" className="date-input-btn" onClick={openPicker} aria-label="Choose a date from the calendar">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </button>
      <input
        ref={pickerRef}
        type="date"
        className="date-input-native"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ""}
        min={min}
        max={max}
        onChange={handlePicked}
      />
    </span>
  );
}

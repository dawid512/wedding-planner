// Shared UI helpers used across page components

import React from "react";

// ============================================================
// DATE INPUT — with × clear button (visible on mobile edit mode)
// ============================================================

interface DateInputProps {
  type?: "date" | "datetime-local" | "time";
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function DateInput({ type = "date", value, onChange, className = "field__input", style }: DateInputProps) {
  return (
    <div className="date-input-wrap" style={style}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
      {value && (
        <button
          type="button"
          className="date-clear-btn"
          onClick={() => onChange("")}
          title="Wyczyść datę"
          aria-label="Wyczyść datę"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ============================================================
// PAGE HEADER
// ============================================================

interface StatItem {
  num: number | string;
  label: string;
}

export interface PageHeaderProps {
  eyebrow: string;
  title: string;
  sub?: string;
  stats?: StatItem[];
}

export function PageHeader({ eyebrow, title, sub, stats }: PageHeaderProps) {
  return (
    <div className="page__header">
      <div>
        <div className="page__eyebrow">{eyebrow}</div>
        <h1 className="page__title">{title}</h1>
        {sub && <div className="page__sub">{sub}</div>}
      </div>
      {stats && (
        <div className="page__stats">
          {stats.map((s, i) => (
            <div className="stat" key={i}>
              <div className="stat__num">{s.num}</div>
              <div className="stat__label">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

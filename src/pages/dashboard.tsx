// Dashboard — strona główna z odliczaniem i statystykami
import React from "react";
import { Field, Check, fmtCurrency, fmtDate, daysUntil, allOutfitTotals } from "../core";
import type { AppData } from "../core";
import type { PageProps } from "../core";
import { DateInput } from "./_shared";

export function PageDashboard({ data, set, editing }: PageProps) {
  const dleft = daysUntil(data.couple.date);
  const months = dleft != null ? Math.floor(dleft / 30) : null;
  const weeks  = dleft != null ? Math.floor(dleft / 7)  : null;

  const tasksDone        = data.tasks.filter(t => t.done && t.title).length;
  const tasksTotal       = data.tasks.filter(t => t.title).length;
  const guestsConfirmed  = data.guests.filter(g => g.rsvp === "Potwierdzony" && g.name).length;
  const guestsTotal      = data.guests.filter(g => g.name).length;

  const budgetPlanned    = data.budgetItems.reduce((s, b) => s + (parseFloat(b.planned) || 0), 0);
  const budgetSpent      = data.budgetItems.reduce((s, b) => s + (parseFloat(b.actual)  || 0), 0);
  const outfitT          = allOutfitTotals(data);
  const budgetPlannedAll = budgetPlanned + outfitT.planned;
  const budgetSpentAll   = budgetSpent   + outfitT.paid;
  const vendorsBooked    = data.vendors.filter(v => v.status === "Zarezerwowany").length;
  const vendorsTotal     = data.vendors.length;

  return (
    <div className="page">
      <div className="hero">
        <div className="hero__eyebrow">— Nasz ślub —</div>
        <div className="hero__names">
          <Field
            value={data.couple.partner1}
            onChange={(v) => set((d: AppData) => ({ ...d, couple: { ...d.couple, partner1: v } }))}
            placeholder="Imię"
            editing={editing}
            inline
          />
          <span className="hero__amp"> &amp; </span>
          <Field
            value={data.couple.partner2}
            onChange={(v) => set((d: AppData) => ({ ...d, couple: { ...d.couple, partner2: v } }))}
            placeholder="Imię"
            editing={editing}
            inline
          />
        </div>
        <div className="hero__meta">
          <div>
            <span className="hero__meta-label">Data</span>
            <span className="hero__meta-val">
              {editing ? (
                <DateInput
                  value={data.couple.date || ""}
                  onChange={(v) => set((d: AppData) => ({ ...d, couple: { ...d.couple, date: v } }))}
                  className="field__input"
                  style={{ font: "inherit", fontSize: "inherit" }}
                />
              ) : (
                <span className={!data.couple.date ? "muted" : ""}>
                  {data.couple.date ? fmtDate(data.couple.date) : "Wybierz datę"}
                </span>
              )}
            </span>
          </div>
          <div>
            <span className="hero__meta-label">Miejsce</span>
            <span className="hero__meta-val">
              <Field
                value={data.couple.venue}
                onChange={(v) => set((d: AppData) => ({ ...d, couple: { ...d.couple, venue: v } }))}
                placeholder="Nazwa sali"
                editing={editing}
                inline
              />
            </span>
          </div>
          <div>
            <span className="hero__meta-label">Miasto</span>
            <span className="hero__meta-val">
              <Field
                value={data.couple.city}
                onChange={(v) => set((d: AppData) => ({ ...d, couple: { ...d.couple, city: v } }))}
                placeholder="Miasto"
                editing={editing}
                inline
              />
            </span>
          </div>
        </div>
        {dleft != null && dleft >= 0 && (
          <div className="countdown">
            <div className="countdown__cell">
              <div className="countdown__num">{dleft}</div>
              <div className="countdown__label">Dni</div>
            </div>
            <div className="countdown__cell">
              <div className="countdown__num">{weeks}</div>
              <div className="countdown__label">Tygodni</div>
            </div>
            <div className="countdown__cell">
              <div className="countdown__num">{months}</div>
              <div className="countdown__label">Miesięcy</div>
            </div>
          </div>
        )}
      </div>

      <div className="ornament">postępy</div>

      <div className="grid grid--4 mt-24">
        <div className="kpi">
          <div className="kpi__label">Zadania</div>
          <div className="kpi__num">{tasksDone}<span style={{ color: "var(--ink-faint)", fontSize: 20 }}>/{tasksTotal || "—"}</span></div>
          <div className="kpi__sub">ukończonych</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Goście potwierdzeni</div>
          <div className="kpi__num">{guestsConfirmed}<span style={{ color: "var(--ink-faint)", fontSize: 20 }}>/{guestsTotal || "—"}</span></div>
          <div className="kpi__sub">RSVP</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Budżet wydany</div>
          <div className="kpi__num">{budgetSpentAll ? fmtCurrency(budgetSpentAll) : "—"}</div>
          <div className="kpi__sub">z {budgetPlannedAll ? fmtCurrency(budgetPlannedAll) : "—"} planowanych</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Dostawcy</div>
          <div className="kpi__num">{vendorsBooked}<span style={{ color: "var(--ink-faint)", fontSize: 20 }}>/{vendorsTotal}</span></div>
          <div className="kpi__sub">zarezerwowanych</div>
        </div>
      </div>

      <div className="section mt-24">
        <div className="section__h">
          <h2 className="section__title">Nadchodzące zadania</h2>
          <span className="section__hint">5 najpilniejszych</span>
        </div>
        <div>
          {data.tasks.filter(t => t.title && !t.done).slice(0, 5).map(t => (
            <div key={t.id} className="task">
              <Check
                on={t.done}
                onClick={() => set((d: AppData) => ({ ...d, tasks: d.tasks.map(x => x.id === t.id ? { ...x, done: !x.done } : x) }))}
              />
              <div className="task__title">{t.title}</div>
              <span className="tag">{t.category}</span>
              <span className="task__due">{t.due ? fmtDate(t.due) : "—"}</span>
            </div>
          ))}
          {data.tasks.filter(t => t.title && !t.done).length === 0 && (
            <div className="muted serif-italic" style={{ padding: "20px 0", textAlign: "center" }}>
              Brak zadań. Dodaj pierwsze w zakładce „Zadania".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

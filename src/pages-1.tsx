// Wedding Planner — page components (part 1)

import React from "react";
import { Field, Check, Icon, fmtCurrency, fmtDate, daysUntil, allOutfitTotals } from "./core";
import type { AppData, DataUpdater, PageProps, GuestType } from "./core";

// ============================================================
// DASHBOARD
// ============================================================
function PageDashboard({ data, set, editing }: PageProps) {
  const dleft = daysUntil(data.couple.date);
  const months = dleft != null ? Math.floor(dleft / 30) : null;
  const weeks = dleft != null ? Math.floor(dleft / 7) : null;

  const tasksDone = data.tasks.filter(t => t.done && t.title).length;
  const tasksTotal = data.tasks.filter(t => t.title).length;
  const guestsConfirmed = data.guests.filter(g => g.rsvp === "Potwierdzony" && g.name).length;
  const guestsTotal = data.guests.filter(g => g.name).length;

  const budgetPlanned = data.budgetItems.reduce((sum, b) => sum + (parseFloat(b.planned) || 0), 0);
  const budgetSpent = data.budgetItems.reduce((sum, b) => sum + (parseFloat(b.actual) || 0), 0);
  const outfitT = allOutfitTotals(data);
  const budgetPlannedAll = budgetPlanned + outfitT.planned;
  const budgetSpentAll = budgetSpent + outfitT.paid;
  const vendorsBooked = data.vendors.filter(v => v.status === "Zarezerwowany").length;
  const vendorsTotal = data.vendors.length;

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
                <input
                  type="date"
                  value={data.couple.date || ""}
                  onChange={(e) => set((d: AppData) => ({ ...d, couple: { ...d.couple, date: e.target.value } }))}
                  style={{ font: "inherit", fontSize: "inherit", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 6px", background: "var(--surface)", color: "inherit" }}
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
              <Check on={t.done} onClick={() => set((d: AppData) => ({ ...d, tasks: d.tasks.map(x => x.id === t.id ? { ...x, done: !x.done } : x) }))} />
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

// ============================================================
// TASKS
// ============================================================
function PageTasks({ data, set, editing }: PageProps) {
  const addTask = () => set((d: AppData) => ({
    ...d,
    tasks: [...d.tasks, { id: "t" + Date.now(), title: "", due: "", done: false, category: "Organizacja", priority: "Średni" }],
  }));
  const removeTask = (id: string) => set((d: AppData) => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }));
  const updateTask = (id: string, patch: Partial<AppData["tasks"][number]>) => set((d: AppData) => ({
    ...d,
    tasks: d.tasks.map(t => t.id === id ? { ...t, ...patch } : t),
  }));

  const total = data.tasks.length;
  const done = data.tasks.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="page">
      <PageHeader
        eyebrow="02 — Lista zadań"
        title="Co jeszcze do zrobienia"
        sub="Wszystkie kroki do uporządkowania. Odhaczaj, dodawaj kategorie i terminy. Sortowanie ustaw wedle uznania."
        stats={[
          { num: done, label: "Ukończone" },
          { num: total - done, label: "Pozostało" },
          { num: pct + "%", label: "Postęp" },
        ]}
      />

      <div className="card">
        {data.tasks.map(t => {
          const prioTag = t.priority === "Wysoki" ? "tag--no" : t.priority === "Niski" ? "tag" : "tag--warn";
          return (
            <div key={t.id} className={"task " + (t.done ? "task--done" : "")} style={{ gridTemplateColumns: "24px 1fr auto auto auto" + (editing ? " auto" : "") }}>
              <Check on={t.done} onClick={() => updateTask(t.id, { done: !t.done })} />
              <div className="task__title">
                <Field
                  value={t.title}
                  onChange={(v) => updateTask(t.id, { title: v })}
                  placeholder="Nazwa zadania…"
                  editing={editing}
                  inline
                />
              </div>
              <div>
                <Field
                  value={t.priority}
                  onChange={(v) => updateTask(t.id, { priority: v })}
                  editing={editing}
                  inline
                  options={["Wysoki", "Średni", "Niski"]}
                />
                {!editing && t.priority && <span className={"tag " + prioTag}>{t.priority}</span>}
              </div>
              <div>
                <Field
                  value={t.category}
                  onChange={(v) => updateTask(t.id, { category: v })}
                  editing={editing}
                  inline
                  options={["Organizacja", "Sala", "Stroje", "Goście", "Dostawcy", "Dokumenty", "Inne"]}
                />
                {!editing && <span className="tag">{t.category}</span>}
              </div>
              <div className="task__due">
                {editing ? (
                  <input
                    type="date"
                    value={t.due || ""}
                    onChange={(e) => updateTask(t.id, { due: e.target.value })}
                    className="field__input"
                    style={{ minWidth: 140 }}
                  />
                ) : (t.due ? fmtDate(t.due) : "—")}
              </div>
              {editing && (
                <button className="btn btn--ghost btn--icon" onClick={() => removeTask(t.id)} title="Usuń">
                  <Icon name="trash" />
                </button>
              )}
            </div>
          );
        })}

        {editing && (
          <div className="add-row">
            <button className="btn btn--small" onClick={addTask}>
              <Icon name="plus" size={12} /> Dodaj zadanie
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// BUDGET
// ============================================================
function PageBudget({ data, set, editing }: PageProps) {
  const addItem = () => set((d: AppData) => ({
    ...d,
    budgetItems: [...d.budgetItems, { id: "b" + Date.now(), category: "", planned: "", actual: "", paid: false, paidDate: "", notes: "" }],
  }));
  const removeItem = (id: string) => set((d: AppData) => ({ ...d, budgetItems: d.budgetItems.filter(b => b.id !== id) }));
  const updateItem = (id: string, patch: Partial<AppData["budgetItems"][number]>) => set((d: AppData) => ({
    ...d,
    budgetItems: d.budgetItems.map(b => b.id === id ? { ...b, ...patch } : b),
  }));

  const planned = data.budgetItems.reduce((s, b) => s + (parseFloat(b.planned) || 0), 0);
  const actual = data.budgetItems.reduce((s, b) => s + (parseFloat(b.actual) || 0), 0);
  const outfit = allOutfitTotals(data);
  const plannedAll = planned + outfit.planned;
  const actualAll = actual + outfit.paid;
  const total = parseFloat(data.budgetTotal) || 0;
  const remaining = total ? total - actualAll : null;
  const pct = total ? Math.min(100, Math.round((actualAll / total) * 100)) : 0;

  return (
    <div className="page">
      <PageHeader
        eyebrow="03 — Budżet"
        title="Pieniądze pod kontrolą"
        sub="Łączny budżet, kategorie i postęp wydatków. Pola działają jako zwykłe liczby — formatowanie waluty stosujemy automatycznie."
        stats={[
          { num: total ? fmtCurrency(total) : "—", label: "Budżet całkowity" },
          { num: actualAll ? fmtCurrency(actualAll) : "—", label: "Wydane" },
          { num: remaining != null ? fmtCurrency(remaining) : "—", label: "Pozostało" },
        ]}
      />

      <div className="card mb-24">
        <div className="row">
          <div className="row__label">Budżet całkowity</div>
          <div className="serif-italic" style={{ fontSize: 24 }}>
            {editing ? (
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={data.budgetTotal || ""}
                placeholder="np. 60000"
                onChange={(e) => {
                  const numeric = e.target.value.replace(/[^0-9]/g, "");
                  set((d: AppData) => ({ ...d, budgetTotal: numeric }));
                }}
                style={{ font: "inherit", fontSize: "inherit", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 6px", background: "var(--surface)", color: "inherit", width: "12ch" }}
              />
            ) : (
              <span className={!data.budgetTotal ? "muted" : ""}>
                {data.budgetTotal ? Number(data.budgetTotal).toLocaleString("pl-PL") + " zł" : "—"}
              </span>
            )}
          </div>
        </div>

        <div className="row" style={{ alignItems: "flex-start" }}>
          <div className="row__label" style={{ paddingTop: 4 }}>Postęp</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-faint)", marginBottom: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "var(--sage)", opacity: 0.5 }} />
                Planowane <strong style={{ color: "var(--ink)", marginLeft: 4 }}>{fmtCurrency(plannedAll)}</strong>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: pct > 100 ? "oklch(0.6 0.15 28)" : pct > 80 ? "var(--gold)" : "var(--sage)" }} />
                Wydane <strong style={{ color: "var(--ink)", marginLeft: 4 }}>{fmtCurrency(actualAll)}</strong>
              </span>
            </div>

            {/* Planowane bar */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 3 }}>
                <span>Planowane</span>
                <span className="mono">{total ? Math.round((plannedAll / total) * 100) : 0}%</span>
              </div>
              <div style={{ height: 6, background: "var(--line-soft)", borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", width: (total ? Math.min(100, Math.round((plannedAll / total) * 100)) : 0) + "%", background: "var(--sage)", opacity: 0.5, borderRadius: 100, transition: "width .4s ease" }} />
              </div>
            </div>

            {/* Wydane bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 3 }}>
                <span>Wydane</span>
                <span className="mono">{pct}%</span>
              </div>
              <div style={{ height: 6, background: "var(--line-soft)", borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: pct > 100 ? "oklch(0.6 0.15 28)" : pct > 80 ? "var(--gold)" : "var(--sage)", borderRadius: 100, transition: "width .4s ease" }} />
              </div>
            </div>

            {total > 0 && (
              <div className="mono muted" style={{ fontSize: 11, marginTop: 8 }}>
                Pozostało: {fmtCurrency(total - actualAll)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section__h">
          <h2 className="section__title">Kategorie</h2>
          <span className="section__hint">{data.budgetItems.length} pozycji</span>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Kategoria</th>
                <th className="num">Planowane</th>
                <th className="num">Wydane</th>
                <th className="num">Różnica</th>
                <th>Status</th>
                {editing && <th></th>}
              </tr>
            </thead>
            <tbody>
              {(outfit.total > 0) && (
                <tr style={{ background: "var(--accent-soft)" }}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="serif-italic" style={{ fontStyle: "italic" }}>Stroje</span>
                      <span className="mono" style={{ fontSize: 9, padding: "2px 6px", background: "var(--paper)", border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: 100, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                        auto · z Stroje
                      </span>
                    </div>
                    <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>
                      {outfit.bought}/{outfit.total} pozycji kupione
                    </div>
                  </td>
                  <td className="num mono">{outfit.planned ? outfit.planned.toLocaleString("pl-PL") + " zł" : "—"}</td>
                  <td className="num mono">{outfit.paid ? outfit.paid.toLocaleString("pl-PL") + " zł" : "—"}</td>
                  <td className="num mono" style={{ color: (outfit.planned - outfit.paid) >= 0 ? "var(--sage)" : "var(--accent)" }}>
                    {(outfit.planned || outfit.paid) ? "+" + (outfit.planned - outfit.paid).toLocaleString("pl-PL") + " zł" : "—"}
                  </td>
                  <td>
                    <span className={"tag " + (outfit.paid === outfit.planned && outfit.planned > 0 ? "tag--ok" : "tag--warn")}>
                      {outfit.planned === 0 ? "—" : (outfit.paid === outfit.planned ? "Opłacone" : `${Math.round((outfit.paid / outfit.planned) * 100)}%`)}
                    </span>
                  </td>
                  {editing && <td></td>}
                </tr>
              )}
              {data.budgetItems.map(b => {
                const p = parseFloat(b.planned) || 0;
                const a = parseFloat(b.actual) || 0;
                const diff = p - a;
                return (
                  <tr key={b.id}>
                    <td>
                      <Field value={b.category} onChange={(v) => updateItem(b.id, { category: v })} placeholder="Kategoria" editing={editing} inline />
                    </td>
                    <td className="num">
                      <Field value={b.planned} onChange={(v) => updateItem(b.id, { planned: v })} placeholder="—" editing={editing} inline type="number" suffix=" zł" />
                    </td>
                    <td className="num">
                      <Field value={b.actual} onChange={(v) => updateItem(b.id, { actual: v })} placeholder="—" editing={editing} inline type="number" suffix=" zł" />
                    </td>
                    <td className="num" style={{ color: diff < 0 ? "var(--accent)" : "var(--sage)" }}>
                      {(p || a) ? (diff >= 0 ? "+" : "") + diff.toLocaleString("pl-PL") + " zł" : "—"}
                    </td>
                    <td>
                      <button
                        className={"tag " + (b.paid ? "tag--ok" : "tag--warn")}
                        onClick={() => updateItem(b.id, { paid: !b.paid })}
                        style={{ border: "none", cursor: "pointer" }}
                      >
                        {b.paid ? "Opłacone" : "Do opłaty"}
                      </button>
                    </td>
                    {editing && (
                      <td>
                        <button className="btn btn--ghost btn--icon" onClick={() => removeItem(b.id)}>
                          <Icon name="trash" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              <tr style={{ background: "var(--line-soft)", fontWeight: 500 }}>
                <td className="serif-italic" style={{ fontSize: 18, fontStyle: "italic" }}>Razem</td>
                <td className="num mono">{plannedAll.toLocaleString("pl-PL")} zł</td>
                <td className="num mono">{actualAll.toLocaleString("pl-PL")} zł</td>
                <td className="num mono">{(plannedAll - actualAll).toLocaleString("pl-PL")} zł</td>
                <td></td>
                {editing && <td></td>}
              </tr>
            </tbody>
          </table>
          {editing && (
            <div className="add-row" style={{ padding: "12px 14px" }}>
              <button className="btn btn--small" onClick={addItem}>
                <Icon name="plus" size={12} /> Dodaj kategorię
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GUESTS
// ============================================================
const GUEST_SIDES = ["Panna młoda", "Pan młody", "Obsługa"] as const;
type GuestSide = typeof GUEST_SIDES[number];

const GUEST_TYPE_LABELS: Record<GuestType, string> = {
  adult: "Dorosły",
  child_half: "Dziecko 50%",
  child_free: "Dziecko bezpłatne",
};
const STAFF_TYPE_LABELS: Record<GuestType, string> = {
  adult: "Pełna cena (100%)",
  child_half: "Połowa ceny (50%)",
  child_free: "Bezpłatnie (0%)",
};

function guestPrice(pp: number, gt: GuestType | undefined): number {
  const t = gt ?? "adult";
  if (t === "child_free") return 0;
  if (t === "child_half") return pp * 0.5;
  return pp;
}

function NumInput({ value, onChange, placeholder, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
      style={{ font: "inherit", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 8px", background: "var(--surface)", color: "inherit", width: "10ch", ...style }}
    />
  );
}

function PageGuests({ data, set, editing }: PageProps) {
  const vs = data.venueSettings ?? { platePrice: "", afterPartyPlatePrice: "", deposit: "" };
  const pp = parseFloat(vs.platePrice) || 0;
  const app = parseFloat(vs.afterPartyPlatePrice) || 0;
  const dep = parseFloat(vs.deposit) || 0;

  const addGuest = (side: GuestSide) => set((d: AppData) => ({
    ...d,
    guests: [...d.guests, { id: "g" + Date.now(), name: "", side, rsvp: "Czeka", diet: "", plusone: false, guestType: "adult" as GuestType, phone: "", address: "", needsAccommodation: false, needsTransport: false, giftReceived: false, poprawiny: false }],
  }));
  const removeGuest = (id: string) => set((d: AppData) => ({ ...d, guests: d.guests.filter(g => g.id !== id) }));
  const updateGuest = (id: string, patch: Partial<AppData["guests"][number]>) => set((d: AppData) => ({
    ...d,
    guests: d.guests.map(g => g.id === id ? { ...g, ...patch } : g),
  }));
  const setVenue = (patch: Partial<typeof vs>) => set((d: AppData) => ({
    ...d,
    venueSettings: { ...(d.venueSettings ?? { platePrice: "", afterPartyPlatePrice: "", deposit: "" }), ...patch },
  }));

  const named = data.guests.filter(g => g.name);
  const active = named.filter(g => g.rsvp !== "Odmowa");
  const confirmed = named.filter(g => g.rsvp === "Potwierdzony").length;
  const declined = named.filter(g => g.rsvp === "Odmowa").length;
  const waiting = named.filter(g => g.rsvp === "Czeka").length;
  const childCount = named.filter(g => g.guestType === "child_half" || g.guestType === "child_free").length;
  const accom = named.filter(g => g.needsAccommodation).length;
  const transp = named.filter(g => g.needsTransport).length;
  const afterPartyCount = named.filter(g => g.poprawiny).length;

  // Cost calculation (all named non-declined guests)
  const adultsCount = active.filter(g => !g.guestType || g.guestType === "adult").length;
  const halfCount = active.filter(g => g.guestType === "child_half").length;
  const freeCount = active.filter(g => g.guestType === "child_free").length;
  const totalCost = pp > 0 ? (adultsCount * pp) + (halfCount * pp * 0.5) : 0;
  const afterPartyCost = app > 0 ? afterPartyCount * app : 0;

  const rsvpTag = (s: string): string => {
    if (s === "Potwierdzony") return "tag--ok";
    if (s === "Odmowa") return "tag--no";
    return "tag--warn";
  };

  const guestTypeTag = (gt: GuestType | undefined, isStaff: boolean): string => {
    const t = gt ?? "adult";
    if (isStaff) return t === "adult" ? "" : t === "child_half" ? "tag--warn" : "tag--no";
    return t === "adult" ? "" : t === "child_half" ? "tag--warn" : "tag--ok";
  };

  // Group guests by side
  const bySide: Record<GuestSide, typeof data.guests> = {
    "Panna młoda": [],
    "Pan młody": [],
    "Obsługa": [],
  };
  data.guests.forEach(g => {
    const side = (GUEST_SIDES as readonly string[]).includes(g.side) ? g.side as GuestSide : "Panna młoda";
    bySide[side].push(g);
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow="04 — Goście"
        title="Lista zaproszonych"
        sub="Podzielona na stronę pani młodej, pana młodego oraz obsługę. Typ gościa (dorosły / dziecko 50% / bezpłatne) i poprawiny dla każdej osoby."
        stats={[
          { num: named.length, label: "Łącznie" },
          { num: confirmed, label: "Potwierdzeni" },
          { num: waiting, label: "Oczekuje" },
          { num: declined, label: "Odmowa" },
          { num: childCount, label: "Dzieci" },
          { num: afterPartyCount, label: "Poprawiny" },
          { num: accom, label: "Nocleg" },
          { num: transp, label: "Transport" },
        ]}
      />

      {/* Venue settings + cost calculator */}
      <div className="card mb-24">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <div className="row__label" style={{ marginBottom: 6 }}>Cena talerzyk (sala)</div>
            {editing ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <NumInput value={vs.platePrice} onChange={(v) => setVenue({ platePrice: v })} placeholder="np. 200" />
                <span className="muted">zł / os.</span>
              </div>
            ) : (
              <span className="serif-italic" style={{ fontSize: 20 }}>
                {vs.platePrice ? Number(vs.platePrice).toLocaleString("pl-PL") + " zł" : "—"}
              </span>
            )}
          </div>
          <div>
            <div className="row__label" style={{ marginBottom: 6 }}>Cena talerzyk (poprawiny)</div>
            {editing ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <NumInput value={vs.afterPartyPlatePrice} onChange={(v) => setVenue({ afterPartyPlatePrice: v })} placeholder="np. 150" />
                <span className="muted">zł / os.</span>
              </div>
            ) : (
              <span className="serif-italic" style={{ fontSize: 20 }}>
                {vs.afterPartyPlatePrice ? Number(vs.afterPartyPlatePrice).toLocaleString("pl-PL") + " zł" : "—"}
              </span>
            )}
          </div>
          <div>
            <div className="row__label" style={{ marginBottom: 6 }}>Zaliczka</div>
            {editing ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <NumInput value={vs.deposit} onChange={(v) => setVenue({ deposit: v })} placeholder="np. 5000" />
                <span className="muted">zł</span>
              </div>
            ) : (
              <span className="serif-italic" style={{ fontSize: 20 }}>
                {vs.deposit ? Number(vs.deposit).toLocaleString("pl-PL") + " zł" : "—"}
              </span>
            )}
          </div>
        </div>

        {/* Cost breakdown */}
        {pp > 0 && active.length > 0 && (
          <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div className="row__label" style={{ marginBottom: 8 }}>Kalkulator kosztów sali</div>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <tbody>
                  {adultsCount > 0 && (
                    <tr>
                      <td className="muted">Dorośli: {adultsCount} × {pp.toLocaleString("pl-PL")} zł</td>
                      <td className="mono" style={{ textAlign: "right" }}>{(adultsCount * pp).toLocaleString("pl-PL")} zł</td>
                    </tr>
                  )}
                  {halfCount > 0 && (
                    <tr>
                      <td className="muted">Dzieci 50%: {halfCount} × {(pp * 0.5).toLocaleString("pl-PL")} zł</td>
                      <td className="mono" style={{ textAlign: "right" }}>{(halfCount * pp * 0.5).toLocaleString("pl-PL")} zł</td>
                    </tr>
                  )}
                  {freeCount > 0 && (
                    <tr>
                      <td className="muted">Dzieci bezpłatne: {freeCount}</td>
                      <td className="mono" style={{ textAlign: "right" }}>0 zł</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: "1px solid var(--line-soft)", fontWeight: 600 }}>
                    <td style={{ paddingTop: 6 }}>Razem ({active.length} os.)</td>
                    <td className="mono" style={{ textAlign: "right", paddingTop: 6 }}>{totalCost.toLocaleString("pl-PL")} zł</td>
                  </tr>
                  {dep > 0 && (
                    <tr style={{ color: "var(--sage)" }}>
                      <td>Zaliczka</td>
                      <td className="mono" style={{ textAlign: "right" }}>−{dep.toLocaleString("pl-PL")} zł</td>
                    </tr>
                  )}
                  {dep > 0 && (
                    <tr style={{ fontWeight: 600 }}>
                      <td>Do zapłaty</td>
                      <td className="mono" style={{ textAlign: "right" }}>{Math.max(0, totalCost - dep).toLocaleString("pl-PL")} zł</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {app > 0 && afterPartyCount > 0 && (
              <div>
                <div className="row__label" style={{ marginBottom: 8 }}>Poprawiny</div>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td className="muted">{afterPartyCount} os. × {app.toLocaleString("pl-PL")} zł</td>
                      <td className="mono" style={{ textAlign: "right" }}>{afterPartyCost.toLocaleString("pl-PL")} zł</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {GUEST_SIDES.map(side => {
        const groupGuests = bySide[side];
        const groupNamed = groupGuests.filter(g => g.name).length;
        const isStaff = side === "Obsługa";
        const typeLabels = isStaff ? STAFF_TYPE_LABELS : GUEST_TYPE_LABELS;
        return (
          <div className="section" key={side}>
            <div className="section__h">
              <h2 className="section__title">
                {side === "Panna młoda" && "Goście panny młodej"}
                {side === "Pan młody" && "Goście pana młodego"}
                {side === "Obsługa" && "Obsługa weselna"}
              </h2>
              <span className="section__hint">{groupNamed} {groupNamed === 1 ? "osoba" : "osób"}</span>
            </div>
            <div className="card" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Imię i nazwisko</th>
                    <th>Kontakt</th>
                    <th>RSVP</th>
                    <th>Preferencje</th>
                    <th style={{ width: 60, textAlign: "center" }}>+1</th>
                    <th style={{ minWidth: 120 }}>Typ / cena</th>
                    <th style={{ width: 80, textAlign: "center" }}>Poprawiny</th>
                    <th style={{ width: 130, textAlign: "center" }}>Logistyka<br/><span className="mono muted" style={{ fontSize: 9 }}>nocleg · trans · prezent</span></th>
                    {editing && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {groupGuests.length === 0 && (
                    <tr>
                      <td colSpan={editing ? 10 : 9} className="muted serif-italic" style={{ textAlign: "center", padding: "24px 14px", fontStyle: "italic" }}>
                        Brak osób w tej grupie. {editing ? 'Kliknij „Dodaj" poniżej.' : "Włącz tryb edycji, by dodać."}
                      </td>
                    </tr>
                  )}
                  {groupGuests.map((g, i) => {
                    const gt: GuestType = (g.guestType as GuestType) ?? "adult";
                    const unitPrice = guestPrice(pp, gt);
                    return (
                      <tr key={g.id}>
                        <td className="mono muted">{String(i + 1).padStart(2, "0")}</td>
                        <td>
                          <Field value={g.name} onChange={(v) => updateGuest(g.id, { name: v })} placeholder="np. Anna Kowalska" editing={editing} inline />
                          {editing && (
                            <div style={{ marginTop: 6 }}>
                              <Field value={g.side} onChange={(v) => updateGuest(g.id, { side: v })} editing={editing} inline options={[...GUEST_SIDES]} />
                            </div>
                          )}
                          {editing && (
                            <div style={{ marginTop: 6 }}>
                              <Field value={g.address} onChange={(v) => updateGuest(g.id, { address: v })} placeholder="adres (opcjonalnie)" editing={editing} inline />
                            </div>
                          )}
                          {!editing && g.address && <div className="muted mono" style={{ fontSize: 10, marginTop: 2 }}>{g.address}</div>}
                        </td>
                        <td>
                          <Field value={g.phone} onChange={(v) => updateGuest(g.id, { phone: v })} placeholder="+48…" editing={editing} inline />
                        </td>
                        <td>
                          {editing
                            ? <Field value={g.rsvp} onChange={(v) => updateGuest(g.id, { rsvp: v })} editing={editing} inline options={["Czeka", "Potwierdzony", "Odmowa"]} />
                            : <span className={"tag " + rsvpTag(g.rsvp)}>{g.rsvp}</span>
                          }
                        </td>
                        <td>
                          <Field value={g.diet} onChange={(v) => updateGuest(g.id, { diet: v })} placeholder="np. wegetariańskie" editing={editing} inline />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Check on={g.plusone} onClick={() => updateGuest(g.id, { plusone: !g.plusone })} />
                        </td>
                        <td>
                          {editing ? (
                            <select
                              className="field field--inline is-editing field__input"
                              value={gt}
                              onChange={(e) => updateGuest(g.id, { guestType: e.target.value as GuestType })}
                              style={{ width: "100%" }}
                            >
                              {(Object.entries(typeLabels) as [GuestType, string][]).map(([val, lbl]) => (
                                <option key={val} value={val}>{lbl}</option>
                              ))}
                            </select>
                          ) : (
                            <div>
                              {gt !== "adult" && (
                                <span className={"tag " + guestTypeTag(gt, isStaff)}>
                                  {typeLabels[gt]}
                                </span>
                              )}
                              {gt === "adult" && isStaff && <span className="muted" style={{ fontSize: 12 }}>100%</span>}
                              {pp > 0 && g.rsvp !== "Odmowa" && (
                                <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>{unitPrice.toLocaleString("pl-PL")} zł</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Check on={g.poprawiny ?? false} onClick={() => updateGuest(g.id, { poprawiny: !(g.poprawiny ?? false) })} />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                            <span title="Potrzebny nocleg">
                              <Check on={g.needsAccommodation} onClick={() => updateGuest(g.id, { needsAccommodation: !g.needsAccommodation })} />
                            </span>
                            <span title="Potrzebny transport">
                              <Check on={g.needsTransport} onClick={() => updateGuest(g.id, { needsTransport: !g.needsTransport })} />
                            </span>
                            <span title="Prezent otrzymany">
                              <Check on={g.giftReceived} onClick={() => updateGuest(g.id, { giftReceived: !g.giftReceived })} />
                            </span>
                          </div>
                        </td>
                        {editing && (
                          <td>
                            <button className="btn btn--ghost btn--icon" onClick={() => removeGuest(g.id)}>
                              <Icon name="trash" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {editing && (
                <div className="add-row" style={{ padding: "12px 14px" }}>
                  <button className="btn btn--small" onClick={() => addGuest(side)}>
                    <Icon name="plus" size={12} /> Dodaj {isStaff ? "osobę obsługi" : "gościa"}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// PAGE HEADER HELPER
// ============================================================
interface StatItem {
  num: number | string;
  label: string;
}

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  sub?: string;
  stats?: StatItem[];
}

function PageHeader({ eyebrow, title, sub, stats }: PageHeaderProps) {
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

export { PageDashboard, PageTasks, PageBudget, PageGuests, PageHeader };

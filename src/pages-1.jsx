// Wedding Planner — page components (part 1)

import { Field, Check, Icon, fmtCurrency, fmtDate, daysUntil, allOutfitTotals } from "./core";

// ============================================================
// DASHBOARD
// ============================================================
function PageDashboard({ data, set, editing }) {
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
            onChange={(v) => set(d => ({ ...d, couple: { ...d.couple, partner1: v } }))}
            placeholder="Imię"
            editing={editing}
            inline
          />
          <span className="hero__amp"> &amp; </span>
          <Field
            value={data.couple.partner2}
            onChange={(v) => set(d => ({ ...d, couple: { ...d.couple, partner2: v } }))}
            placeholder="Imię"
            editing={editing}
            inline
          />
        </div>
        <div className="hero__meta">
          <div>
            <span className="hero__meta-label">Data</span>
            <span className="hero__meta-val">
              <Field
                value={data.couple.date ? fmtDate(data.couple.date) : ""}
                onChange={(v) => set(d => ({ ...d, couple: { ...d.couple, date: v } }))}
                placeholder="Wybierz datę"
                editing={editing}
                inline
                type={editing ? "date" : "text"}
              />
              {editing && (
                <input
                  type="date"
                  value={data.couple.date || ""}
                  onChange={(e) => set(d => ({ ...d, couple: { ...d.couple, date: e.target.value } }))}
                  style={{ display: "none" }}
                />
              )}
            </span>
          </div>
          <div>
            <span className="hero__meta-label">Miejsce</span>
            <span className="hero__meta-val">
              <Field
                value={data.couple.venue}
                onChange={(v) => set(d => ({ ...d, couple: { ...d.couple, venue: v } }))}
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
                onChange={(v) => set(d => ({ ...d, couple: { ...d.couple, city: v } }))}
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
              <Check on={t.done} onClick={() => set(d => ({ ...d, tasks: d.tasks.map(x => x.id === t.id ? { ...x, done: !x.done } : x) }))} />
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
function PageTasks({ data, set, editing }) {
  const addTask = () => set(d => ({
    ...d,
    tasks: [...d.tasks, { id: "t" + Date.now(), title: "", due: "", done: false, category: "Organizacja", priority: "Średni" }],
  }));
  const removeTask = (id) => set(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }));
  const updateTask = (id, patch) => set(d => ({
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
function PageBudget({ data, set, editing }) {
  const addItem = () => set(d => ({
    ...d,
    budgetItems: [...d.budgetItems, { id: "b" + Date.now(), category: "", planned: "", actual: "", paid: false }],
  }));
  const removeItem = (id) => set(d => ({ ...d, budgetItems: d.budgetItems.filter(b => b.id !== id) }));
  const updateItem = (id, patch) => set(d => ({
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
            <Field
              value={data.budgetTotal}
              onChange={(v) => set(d => ({ ...d, budgetTotal: v }))}
              placeholder="np. 60000"
              editing={editing}
              inline
              suffix={data.budgetTotal ? " zł" : ""}
            />
          </div>
        </div>
        <div className="row">
          <div className="row__label">Postęp</div>
          <div>
            <div className="bar" style={{ marginTop: 10 }}>
              <div className={"bar__fill " + (pct > 100 ? "bar__fill--over" : pct > 80 ? "bar__fill--warn" : "bar__fill--ok")} style={{ width: pct + "%" }} />
            </div>
            <div className="mono mt-8 muted">{pct}% wykorzystane</div>
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
const GUEST_SIDES = ["Panna młoda", "Pan młody", "Obsługa"];

function PageGuests({ data, set, editing }) {
  const addGuest = (side) => set(d => ({
    ...d,
    guests: [...d.guests, { id: "g" + Date.now(), name: "", side: side || "Panna młoda", rsvp: "Czeka", diet: "", plusone: false, child: false }],
  }));
  const removeGuest = (id) => set(d => ({ ...d, guests: d.guests.filter(g => g.id !== id) }));
  const updateGuest = (id, patch) => set(d => ({
    ...d,
    guests: d.guests.map(g => g.id === id ? { ...g, ...patch } : g),
  }));

  const named = data.guests.filter(g => g.name);
  const confirmed = named.filter(g => g.rsvp === "Potwierdzony").length;
  const declined = named.filter(g => g.rsvp === "Odmowa").length;
  const waiting = named.filter(g => g.rsvp === "Czeka").length;
  const children = named.filter(g => g.child).length;
  const accom = named.filter(g => g.needsAccommodation).length;
  const transp = named.filter(g => g.needsTransport).length;

  const rsvpTag = (s) => {
    if (s === "Potwierdzony") return "tag--ok";
    if (s === "Odmowa") return "tag--no";
    return "tag--warn";
  };

  // Group guests by side
  const bySide = {};
  GUEST_SIDES.forEach(s => { bySide[s] = []; });
  data.guests.forEach(g => {
    const side = GUEST_SIDES.includes(g.side) ? g.side : "Panna młoda";
    bySide[side].push(g);
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow="04 — Goście"
        title="Lista zaproszonych"
        sub="Podzielona na stronę pani młodej, pana młodego oraz obsługę. Dla każdego: RSVP, preferencje, +1 i czy to dziecko do 5 lat."
        stats={[
          { num: named.length, label: "Łącznie" },
          { num: confirmed, label: "Potwierdzeni" },
          { num: waiting, label: "Oczekuje" },
          { num: declined, label: "Odmowa" },
          { num: children, label: "Dzieci" },
          { num: accom, label: "Nocleg" },
          { num: transp, label: "Transport" },
        ]}
      />

      {GUEST_SIDES.map(side => {
        const groupGuests = bySide[side];
        const groupNamed = groupGuests.filter(g => g.name).length;
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
                    <th style={{ width: 70, textAlign: "center" }}>Dziecko<br/><span className="mono muted" style={{ fontSize: 9 }}>do 5 lat</span></th>
                    <th style={{ width: 130, textAlign: "center" }}>Logistyka<br/><span className="mono muted" style={{ fontSize: 9 }}>nocleg · trans · prezent</span></th>
                    {editing && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {groupGuests.length === 0 && (
                    <tr>
                      <td colSpan={editing ? 9 : 8} className="muted serif-italic" style={{ textAlign: "center", padding: "24px 14px", fontStyle: "italic" }}>
                        Brak osób w tej grupie. {editing ? "Kliknij „Dodaj” poniżej." : "Włącz tryb edycji, by dodać."}
                      </td>
                    </tr>
                  )}
                  {groupGuests.map((g, i) => (
                    <tr key={g.id}>
                      <td className="mono muted">{String(i + 1).padStart(2, "0")}</td>
                      <td>
                        <Field value={g.name} onChange={(v) => updateGuest(g.id, { name: v })} placeholder="np. Anna Kowalska" editing={editing} inline />
                        {editing && (
                          <div style={{ marginTop: 6 }}>
                            <Field value={g.side} onChange={(v) => updateGuest(g.id, { side: v })} editing={editing} inline options={GUEST_SIDES} />
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
                        <Field value={g.rsvp} onChange={(v) => updateGuest(g.id, { rsvp: v })} editing={editing} inline options={["Czeka", "Potwierdzony", "Odmowa"]} />
                        {!editing && <span className={"tag " + rsvpTag(g.rsvp)}>{g.rsvp}</span>}
                      </td>
                      <td>
                        <Field value={g.diet} onChange={(v) => updateGuest(g.id, { diet: v })} placeholder="np. wegetariańskie" editing={editing} inline />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Check on={g.plusone} onClick={() => updateGuest(g.id, { plusone: !g.plusone })} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Check on={g.child} onClick={() => updateGuest(g.id, { child: !g.child })} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <span title="Potrzebny nocleg" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <Check on={g.needsAccommodation} onClick={() => updateGuest(g.id, { needsAccommodation: !g.needsAccommodation })} />
                          </span>
                          <span title="Potrzebny transport" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <Check on={g.needsTransport} onClick={() => updateGuest(g.id, { needsTransport: !g.needsTransport })} />
                          </span>
                          <span title="Prezent otrzymany" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
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
                  ))}
                </tbody>
              </table>
              {editing && (
                <div className="add-row" style={{ padding: "12px 14px" }}>
                  <button className="btn btn--small" onClick={() => addGuest(side)}>
                    <Icon name="plus" size={12} /> Dodaj {side === "Obsługa" ? "osobę obsługi" : "gościa"}
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

// Page header helper
function PageHeader({ eyebrow, title, sub, stats }) {
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

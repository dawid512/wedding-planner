// Plan stołów — rozsadzenie gości przy stołach
import React from "react";
import { Field, Icon } from "../core";
import type { AppData, PageProps } from "../core";
import { PageHeader } from "./_shared";

export function PageTables({ data, set, editing }: PageProps) {
  const assignedIds = new Set<string>();
  data.tables.forEach(t => t.guests.forEach(seat => { if (seat && typeof seat === "string") assignedIds.add(seat); }));

  const guestById: Record<string, AppData["guests"][number]> = {};
  data.guests.forEach(g => { guestById[g.id] = g; });

  const namedGuests  = data.guests.filter(g => g.name);
  const totalNamed   = namedGuests.length;
  const assignedNamed = namedGuests.filter(g => assignedIds.has(g.id)).length;
  const pct          = totalNamed ? Math.round((assignedNamed / totalNamed) * 100) : 0;

  const addTable    = () => set((d: AppData) => ({
    ...d,
    tables: [...d.tables, { id: "table" + Date.now(), name: "Stół " + d.tables.length, capacity: 8, guests: Array(8).fill("") }],
  }));
  const removeTable = (id: string) => set((d: AppData) => ({ ...d, tables: d.tables.filter(t => t.id !== id) }));
  const updateTable = (id: string, patch: Partial<AppData["tables"][number]>) => set((d: AppData) => ({
    ...d,
    tables: d.tables.map(t => t.id === id ? { ...t, ...patch } : t),
  }));
  const updateSeat  = (tid: string, idx: number, v: string) => set((d: AppData) => ({
    ...d,
    tables: d.tables.map(t => {
      if (t.id !== tid) return t;
      const guests = [...t.guests]; guests[idx] = v; return { ...t, guests };
    }),
  }));
  const addSeat     = (tid: string) => set((d: AppData) => ({
    ...d,
    tables: d.tables.map(t => t.id === tid ? { ...t, capacity: t.capacity + 1, guests: [...t.guests, ""] } : t),
  }));
  const removeSeat  = (tid: string, idx: number) => set((d: AppData) => ({
    ...d,
    tables: d.tables.map(t => {
      if (t.id !== tid) return t;
      const guests = t.guests.filter((_, i) => i !== idx);
      return { ...t, capacity: guests.length, guests };
    }),
  }));

  const availableForSeat = (currentId: string) => namedGuests.filter(g => !assignedIds.has(g.id) || g.id === currentId);

  return (
    <div className="page">
      <PageHeader
        eyebrow="05 — Plan stołów"
        title="Rozsadzenie gości"
        sub="Wybierz osobę z listy dla każdego miejsca. Gość wybrany w jednym miejscu znika z pozostałych list."
        stats={[
          { num: pct + "%",                              label: "Przypisani" },
          { num: assignedNamed,                          label: "Na stołach" },
          { num: Math.max(0, totalNamed - assignedNamed),label: "Bez miejsca" },
          { num: data.tables.length,                     label: "Stołów" },
        ]}
      />

      <div className="card mb-24" style={{ marginBottom: 24 }}>
        <div className="row" style={{ gridTemplateColumns: "200px 1fr", borderBottom: "none", padding: "8px 0" }}>
          <div className="row__label">Postęp rozsadzania</div>
          <div>
            <div className="bar" style={{ marginTop: 10 }}>
              <div className={"bar__fill " + (pct === 100 ? "bar__fill--ok" : pct >= 80 ? "" : "bar__fill--warn")} style={{ width: pct + "%" }} />
            </div>
            <div className="mono mt-8 muted">
              {assignedNamed} z {totalNamed} gości przypisanych do stołów
              {totalNamed === 0 && ' — najpierw dodaj gości w zakładce „Lista gości"'}
              {pct === 100 && totalNamed > 0 && " · wszyscy mają miejsce ✓"}
            </div>
          </div>
        </div>
      </div>

      <div className="tables-grid">
        {data.tables.map(t => {
          const filled = t.guests.filter(g => g).length;
          return (
            <div key={t.id} className="table-card">
              <div className="table-card__h">
                <div className="table-card__name">
                  <Field value={t.name} onChange={(v) => updateTable(t.id, { name: v })} placeholder="Nazwa stołu" editing={editing} inline />
                </div>
                <span className="table-card__cap">{filled}/{t.capacity}</span>
              </div>
              <ol className="seats">
                {t.guests.map((seatId, i) => {
                  const g       = seatId ? guestById[seatId] : null;
                  const options = availableForSeat(seatId);
                  return (
                    <li key={i}>
                      <span className="seat-num">{String(i + 1).padStart(2, "0")}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        {editing ? (
                          <select className="field__input" value={seatId || ""} onChange={(e) => updateSeat(t.id, i, e.target.value)}
                            style={{ padding: "2px 6px", fontSize: 13, width: "100%" }}>
                            <option value="">— wolne —</option>
                            {options.map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name}
                                {(opt.guestType === "child_half" || opt.guestType === "child_free") ? " (dziecko)" : ""}
                                {opt.side === "Pan młody" ? " · P.M." : ""}
                                {opt.side === "Obsługa"   ? " · obsługa" : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          g ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ color: "var(--ink)" }}>{g.name}</span>
                              {(g.guestType === "child_half" || g.guestType === "child_free") && <span className="tag" style={{ fontSize: 9, padding: "2px 6px" }}>dziecko</span>}
                              {g.side === "Obsługa" && <span className="tag" style={{ fontSize: 9, padding: "2px 6px" }}>obsługa</span>}
                            </span>
                          ) : (
                            (typeof seatId === "string" && seatId && !guestById[seatId])
                              ? <span>{seatId}</span>
                              : <span className="muted" style={{ fontStyle: "italic" }}>— wolne —</span>
                          )
                        )}
                      </span>
                      {editing && seatId && (
                        <button className="btn btn--ghost btn--icon" style={{ width: 22, height: 22, padding: 0, color: "var(--accent)" }}
                          onClick={() => updateSeat(t.id, i, "")} title="Zwolnij miejsce">
                          <Icon name="x" size={12} />
                        </button>
                      )}
                      {editing && !seatId && (
                        <button className="btn btn--ghost btn--icon" style={{ width: 22, height: 22, padding: 0 }}
                          onClick={() => removeSeat(t.id, i)} title="Usuń miejsce">
                          <Icon name="trash" size={11} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
              {editing && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn btn--small" onClick={() => addSeat(t.id)}><Icon name="plus" size={12} /> Miejsce</button>
                  <button className="btn btn--small btn--ghost" onClick={() => removeTable(t.id)}><Icon name="trash" size={12} /> Usuń stół</button>
                </div>
              )}
            </div>
          );
        })}
        {editing && (
          <button className="table-card" onClick={addTable}
            style={{ border: "1px dashed var(--line)", justifyContent: "center", alignItems: "center", cursor: "pointer", background: "transparent" }}>
            <Icon name="plus" size={28} />
            <span className="mono muted mt-8">Nowy stół</span>
          </button>
        )}
      </div>
    </div>
  );
}

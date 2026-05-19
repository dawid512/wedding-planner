// Budżet — kategorie, sumy, paski postępu; auto-row ze strojów
import React from "react";
import { Field, Icon, fmtCurrency, allOutfitTotals } from "../core";
import type { AppData, PageProps } from "../core";
import { PageHeader } from "./_shared";

export function PageBudget({ data, set, editing }: PageProps) {
  const addItem    = () => set((d: AppData) => ({
    ...d,
    budgetItems: [...d.budgetItems, { id: "b" + Date.now(), category: "", planned: "", actual: "", paid: false, paidDate: "", notes: "" }],
  }));
  const removeItem = (id: string) => set((d: AppData) => ({ ...d, budgetItems: d.budgetItems.filter(b => b.id !== id) }));
  const updateItem = (id: string, patch: Partial<AppData["budgetItems"][number]>) => set((d: AppData) => ({
    ...d,
    budgetItems: d.budgetItems.map(b => b.id === id ? { ...b, ...patch } : b),
  }));

  const planned    = data.budgetItems.reduce((s, b) => s + (parseFloat(b.planned) || 0), 0);
  const actual     = data.budgetItems.reduce((s, b) => s + (parseFloat(b.actual)  || 0), 0);
  const outfit     = allOutfitTotals(data);
  const plannedAll = planned + outfit.planned;
  const actualAll  = actual  + outfit.paid;
  const total      = parseFloat(data.budgetTotal) || 0;
  const remaining  = total ? total - actualAll : null;
  const pct        = total ? Math.min(100, Math.round((actualAll / total) * 100)) : 0;

  return (
    <div className="page">
      <PageHeader
        eyebrow="03 — Budżet"
        title="Pieniądze pod kontrolą"
        sub="Łączny budżet, kategorie i postęp wydatków."
        stats={[
          { num: total      ? fmtCurrency(total)      : "—", label: "Budżet całkowity" },
          { num: actualAll  ? fmtCurrency(actualAll)  : "—", label: "Wydane" },
          { num: remaining != null ? fmtCurrency(remaining) : "—", label: "Pozostało" },
        ]}
      />

      <div className="card mb-24">
        <div className="row">
          <div className="row__label">Budżet całkowity</div>
          <div className="serif-italic" style={{ fontSize: 24 }}>
            {editing ? (
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={data.budgetTotal || ""} placeholder="np. 60000"
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
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 3 }}>
                <span>Planowane</span>
                <span className="mono">{total ? Math.round((plannedAll / total) * 100) : 0}%</span>
              </div>
              <div style={{ height: 6, background: "var(--line-soft)", borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", width: (total ? Math.min(100, Math.round((plannedAll / total) * 100)) : 0) + "%", background: "var(--sage)", opacity: 0.5, borderRadius: 100, transition: "width .4s ease" }} />
              </div>
            </div>
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
              {/* Auto row: Stroje — sumowane z strony Stroje */}
              {outfit.total > 0 && (
                <tr style={{ background: "var(--accent-soft)" }}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="serif-italic" style={{ fontStyle: "italic" }}>Stroje</span>
                      <span className="mono" style={{ fontSize: 9, padding: "2px 6px", background: "var(--paper)", border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: 100, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                        auto · ze strony Stroje
                      </span>
                    </div>
                    <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>
                      {outfit.bought}/{outfit.total} pozycji kupione
                    </div>
                  </td>
                  <td className="num mono">{outfit.planned ? outfit.planned.toLocaleString("pl-PL") + " zł" : "—"}</td>
                  <td className="num mono">{outfit.paid    ? outfit.paid.toLocaleString("pl-PL")    + " zł" : "—"}</td>
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
                const p    = parseFloat(b.planned) || 0;
                const a    = parseFloat(b.actual)  || 0;
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

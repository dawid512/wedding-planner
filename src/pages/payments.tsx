// Płatności — harmonogram opłat z terminami i statusami
import React from "react";
import { Field, Icon, fmtCurrency, fmtDate } from "../core";
import type { AppData, PageProps } from "../core";
import { PageHeader } from "./_shared";

export function PagePayments({ data, set, editing }: PageProps) {
  const payments = data.payments || [];
  const add = () => set((d: AppData) => ({
    ...d,
    payments: [...(d.payments || []), { id: "pay" + Date.now(), what: "", amount: "", dueDate: "", paid: false, paidDate: "", method: "Przelew", note: "" }],
  }));
  const remove = (id: string) => set((d: AppData) => ({ ...d, payments: d.payments.filter(p => p.id !== id) }));
  const update = (id: string, patch: Partial<AppData["payments"][number]>) => set((d: AppData) => ({
    ...d,
    payments: d.payments.map(p => p.id === id ? { ...p, ...patch } : p),
  }));

  const total   = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const paid    = payments.filter(p => p.paid).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const pending = total - paid;
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = payments.filter(p => !p.paid && p.dueDate && new Date(p.dueDate) < today).length;
  const upcoming7 = payments.filter(p => {
    if (p.paid || !p.dueDate) return false;
    const d    = new Date(p.dueDate);
    const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 14;
  }).length;

  return (
    <div className="page">
      <PageHeader
        eyebrow="05 — Płatności"
        title="Harmonogram opłat"
        sub="Zaliczki, raty końcowe. Sortuje się wg terminu, podświetla przeterminowane."
        stats={[
          { num: paid    ? fmtCurrency(paid)    : "—", label: "Zapłacono" },
          { num: pending ? fmtCurrency(pending) : "—", label: "Do zapłaty" },
          { num: upcoming7, label: "Najbliższe 14 dni" },
          { num: overdue,   label: "Przeterminowane" },
        ]}
      />

      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Co</th>
              <th className="num" style={{ width: 110 }}>Kwota</th>
              <th style={{ width: 140 }}>Termin</th>
              <th style={{ width: 130 }}>Metoda</th>
              <th>Notatki</th>
              <th style={{ width: 110 }}>Status</th>
              {editing && <th style={{ width: 36 }}></th>}
            </tr>
          </thead>
          <tbody>
            {payments.map(p => {
              const isOverdue = !p.paid && p.dueDate && new Date(p.dueDate) < today;
              const isSoon    = !p.paid && p.dueDate && (new Date(p.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 7 && new Date(p.dueDate) >= today;
              return (
                <tr key={p.id} style={isOverdue ? { background: "oklch(0.96 0.04 28 / 0.5)" } : {}}>
                  <td>
                    <Field value={p.what} onChange={(v) => update(p.id, { what: v })} placeholder="np. Zaliczka — sala" editing={editing} inline />
                  </td>
                  <td className="num">
                    <Field value={p.amount} onChange={(v) => update(p.id, { amount: v })} placeholder="—" editing={editing} inline type="number" suffix=" zł" />
                  </td>
                  <td>
                    {editing ? (
                      <input type="date" className="field__input" value={p.dueDate || ""} onChange={(e) => update(p.id, { dueDate: e.target.value })} />
                    ) : (
                      <span style={{ color: isOverdue ? "oklch(0.55 0.15 28)" : isSoon ? "var(--accent)" : undefined }}>
                        {p.dueDate ? fmtDate(p.dueDate) : "—"}
                        {isOverdue && <span className="tag tag--no" style={{ marginLeft: 6, fontSize: 9 }}>po terminie</span>}
                        {isSoon    && <span className="tag tag--warn" style={{ marginLeft: 6, fontSize: 9 }}>wkrótce</span>}
                      </span>
                    )}
                  </td>
                  <td>
                    <Field value={p.method} onChange={(v) => update(p.id, { method: v })} editing={editing} inline options={["Przelew", "Gotówka", "BLIK", "Karta"]} />
                  </td>
                  <td>
                    <Field value={p.note} onChange={(v) => update(p.id, { note: v })} placeholder="numer konta, tytuł przelewu…" editing={editing} inline />
                  </td>
                  <td>
                    <button
                      className={"tag " + (p.paid ? "tag--ok" : "tag--warn")}
                      onClick={() => update(p.id, { paid: !p.paid, paidDate: !p.paid ? new Date().toISOString().slice(0, 10) : "" })}
                      style={{ border: "none", cursor: "pointer" }}
                    >
                      {p.paid ? "Zapłacone ✓" : "Oczekuje"}
                    </button>
                  </td>
                  {editing && (
                    <td>
                      <button className="btn btn--ghost btn--icon" onClick={() => remove(p.id)}><Icon name="trash" /></button>
                    </td>
                  )}
                </tr>
              );
            })}
            <tr style={{ background: "var(--line-soft)", fontWeight: 500 }}>
              <td className="serif-italic" style={{ fontSize: 18, fontStyle: "italic" }}>Razem</td>
              <td className="num mono">{total.toLocaleString("pl-PL")} zł</td>
              <td colSpan={editing ? 5 : 4} className="mono" style={{ textAlign: "right", paddingRight: 14 }}>
                zapłacono: <span style={{ color: "var(--sage)", fontWeight: 500 }}>{paid.toLocaleString("pl-PL")} zł</span>
                &nbsp;·&nbsp;
                pozostało: <span style={{ color: "var(--accent)", fontWeight: 500 }}>{pending.toLocaleString("pl-PL")} zł</span>
              </td>
            </tr>
          </tbody>
        </table>
        {editing && (
          <div className="add-row" style={{ padding: "12px 14px" }}>
            <button className="btn btn--small" onClick={add}><Icon name="plus" size={12} /> Dodaj płatność</button>
          </div>
        )}
      </div>
    </div>
  );
}

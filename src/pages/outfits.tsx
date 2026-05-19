// Stroje — lista zakupów odzieżowych z cenami i statusem
import React from "react";
import { Field, Check, Icon, outfitTotals } from "../core";
import type { AppData, PageProps, OutfitItem } from "../core";
import { PageHeader } from "./_shared";

type OutfitListKey = "brideItems" | "groomItems";

interface OutfitsTableProps {
  items: OutfitItem[];
  listKey: OutfitListKey;
  updateItem: (listKey: OutfitListKey, id: string, patch: Partial<OutfitItem>) => void;
  addItem: (listKey: OutfitListKey) => void;
  removeItem: (listKey: OutfitListKey, id: string) => void;
  editing: boolean;
}

function OutfitsTable({ items, listKey, updateItem, addItem, removeItem, editing }: OutfitsTableProps) {
  const totals = outfitTotals(items);
  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="tbl outfit-tbl">
        <thead>
          <tr>
            <th style={{ width: "26%" }}>Pozycja</th>
            <th>Skąd / marka</th>
            <th>Gdzie</th>
            <th className="num" style={{ width: 100 }}>Cena</th>
            <th style={{ width: 80, textAlign: "center" }}>Kupione</th>
            <th style={{ width: 80, textAlign: "center" }}>Opłacone</th>
            {editing && <th style={{ width: 36 }}></th>}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={editing ? 7 : 6} className="muted serif-italic" style={{ textAlign: "center", padding: "20px 14px", fontStyle: "italic" }}>
                Brak pozycji. {editing ? 'Kliknij „Dodaj"' : "Włącz edycję, by dodać"}.
              </td>
            </tr>
          )}
          {items.map(it => (
            <tr key={it.id}>
              <td>
                <Field value={it.name} onChange={(v) => updateItem(listKey, it.id, { name: v })} placeholder="np. Suknia" editing={editing} inline />
              </td>
              <td>
                <Field value={it.where} onChange={(v) => updateItem(listKey, it.id, { where: v })} placeholder="salon / marka" editing={editing} inline />
              </td>
              <td>
                <Field value={it.location} onChange={(v) => updateItem(listKey, it.id, { location: v })} placeholder="adres / odbiór" editing={editing} inline />
              </td>
              <td className="num">
                <Field value={it.price} onChange={(v) => updateItem(listKey, it.id, { price: v })} placeholder="—" editing={editing} inline type="number" suffix=" zł" />
              </td>
              <td style={{ textAlign: "center" }}>
                <Check on={it.bought} onClick={() => updateItem(listKey, it.id, { bought: !it.bought, paid: !it.bought ? it.paid : false })} />
              </td>
              <td style={{ textAlign: "center" }}>
                <Check
                  on={it.paid}
                  onClick={() => updateItem(listKey, it.id, { paid: !it.paid, bought: !it.paid ? true : it.bought })}
                />
              </td>
              {editing && (
                <td>
                  <button className="btn btn--ghost btn--icon" onClick={() => removeItem(listKey, it.id)}>
                    <Icon name="trash" />
                  </button>
                </td>
              )}
            </tr>
          ))}
          <tr style={{ background: "var(--line-soft)" }}>
            <td className="serif-italic" style={{ fontSize: 16, fontStyle: "italic" }} colSpan={3}>
              Razem &nbsp;<span className="mono muted" style={{ fontSize: 11 }}>{totals.bought}/{totals.total} kupione</span>
            </td>
            <td className="num mono" style={{ fontWeight: 500 }}>
              {totals.planned ? totals.planned.toLocaleString("pl-PL") + " zł" : "—"}
            </td>
            <td colSpan={editing ? 3 : 2} className="mono" style={{ textAlign: "right", paddingRight: 14 }}>
              opłacone:&nbsp;
              <span style={{ color: "var(--sage)", fontWeight: 500 }}>
                {totals.paid ? totals.paid.toLocaleString("pl-PL") + " zł" : "—"}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      {editing && (
        <div className="add-row" style={{ padding: "12px 14px" }}>
          <button className="btn btn--small" onClick={() => addItem(listKey)}>
            <Icon name="plus" size={12} /> Dodaj pozycję
          </button>
        </div>
      )}
    </div>
  );
}

export function PageOutfits({ data, set, editing }: PageProps) {
  const o = data.outfits;
  const brideItems = o.brideItems || [];
  const groomItems = o.groomItems || [];

  const updateItem = (listKey: OutfitListKey, id: string, patch: Partial<OutfitItem>) => set((d: AppData) => ({
    ...d,
    outfits: {
      ...d.outfits,
      [listKey]: (d.outfits[listKey] || []).map((x: OutfitItem) => x.id === id ? { ...x, ...patch } : x),
    },
  }));
  const addItem = (listKey: OutfitListKey) => set((d: AppData) => ({
    ...d,
    outfits: {
      ...d.outfits,
      [listKey]: [...(d.outfits[listKey] || []), {
        id: listKey.slice(0, 2) + Date.now(),
        name: "", where: "", location: "", price: "", bought: false, paid: false,
      }],
    },
  }));
  const removeItem = (listKey: OutfitListKey, id: string) => set((d: AppData) => ({
    ...d,
    outfits: {
      ...d.outfits,
      [listKey]: (d.outfits[listKey] || []).filter((x: OutfitItem) => x.id !== id),
    },
  }));

  const updateNotes = (v: string) => set((d: AppData) => ({ ...d, outfits: { ...d.outfits, notes: v } }));

  const brideT = outfitTotals(brideItems);
  const groomT = outfitTotals(groomItems);
  const totalPlanned = brideT.planned + groomT.planned;
  const totalPaid    = brideT.paid    + groomT.paid;
  const totalBought  = brideT.bought  + groomT.bought;
  const totalItems   = brideT.total   + groomT.total;

  return (
    <div className="page">
      <PageHeader
        eyebrow="09 — Stroje"
        title="Co, skąd, za ile"
        sub="Każda pozycja: gdzie kupujesz, gdzie się znajduje, cena, status kupna i opłaty. Sumy idą automatycznie do budżetu."
        stats={[
          { num: totalPlanned ? totalPlanned.toLocaleString("pl-PL") + " zł" : "—", label: "Razem planowane" },
          { num: totalPaid ? totalPaid.toLocaleString("pl-PL") + " zł" : "—", label: "Już opłacone" },
          { num: totalBought + " / " + totalItems, label: "Kupione" },
        ]}
      />

      <div className="section">
        <div className="section__h">
          <h2 className="section__title">Panna młoda</h2>
          <span className="section__hint">{brideT.bought}/{brideT.total} kupione · {brideT.paid.toLocaleString("pl-PL")} zł opłacone</span>
        </div>
        <OutfitsTable items={brideItems} listKey="brideItems" updateItem={updateItem} addItem={addItem} removeItem={removeItem} editing={editing} />
      </div>

      <div className="section">
        <div className="section__h">
          <h2 className="section__title">Pan młody</h2>
          <span className="section__hint">{groomT.bought}/{groomT.total} kupione · {groomT.paid.toLocaleString("pl-PL")} zł opłacone</span>
        </div>
        <OutfitsTable items={groomItems} listKey="groomItems" updateItem={updateItem} addItem={addItem} removeItem={removeItem} editing={editing} />
      </div>

      <div className="card mt-24">
        <div className="row" style={{ gridTemplateColumns: "180px 1fr", borderBottom: "none", padding: "8px 0" }}>
          <div className="row__label">Notatki</div>
          <Field value={o.notes} onChange={updateNotes} placeholder="Terminy przymiarek, kontakty, uwagi…" editing={editing} multiline />
        </div>
      </div>
    </div>
  );
}

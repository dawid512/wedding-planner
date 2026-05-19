// Dostawcy — kontakty, ceny, statusy
import React from "react";
import { Field, Icon } from "../core";
import type { AppData, PageProps } from "../core";
import { PageHeader } from "./_shared";

export function PageVendors({ data, set, editing }: PageProps) {
  const add = () => set((d: AppData) => ({
    ...d,
    vendors: [...d.vendors, { id: "v" + Date.now(), name: "", category: "", contact: "", phone: "", price: "", status: "Szukam", notes: "" }],
  }));
  const remove = (id: string) => set((d: AppData) => ({ ...d, vendors: d.vendors.filter(v => v.id !== id) }));
  const update = (id: string, patch: Partial<AppData["vendors"][number]>) => set((d: AppData) => ({
    ...d,
    vendors: d.vendors.map(v => v.id === id ? { ...v, ...patch } : v),
  }));

  const booked = data.vendors.filter(v => v.status === "Zarezerwowany").length;
  const negotiating = data.vendors.filter(v => v.status === "W rozmowie").length;

  const statusTag = (s: string): string => {
    if (s === "Zarezerwowany") return "tag--ok";
    if (s === "W rozmowie") return "tag--warn";
    if (s === "Odrzucony") return "tag--no";
    return "";
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="06 — Dostawcy"
        title="Z kim współpracujemy"
        sub="Sala, fotograf, DJ, catering — wszyscy w jednym miejscu z kontaktami, cenami i statusem rezerwacji."
        stats={[
          { num: data.vendors.length, label: "Razem" },
          { num: booked, label: "Zarezerwowani" },
          { num: negotiating, label: "W rozmowie" },
        ]}
      />

      <div className="grid grid--2">
        {data.vendors.map(v => (
          <div className="card" key={v.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, borderBottom: "1px solid var(--line-soft)", paddingBottom: 10 }}>
              <div>
                <div className="mono muted" style={{ marginBottom: 2 }}>
                  <Field value={v.category} onChange={(val) => update(v.id, { category: val })} placeholder="Kategoria" editing={editing} inline options={["Sala weselna", "Fotograf", "Film", "DJ", "Catering", "Kwiaciarnia", "Tort", "Cukiernia", "Zaproszenia", "Obrączki", "Stylista", "Inne"]} />
                </div>
                <div className="serif-italic" style={{ fontSize: 22 }}>
                  <Field value={v.name} onChange={(val) => update(v.id, { name: val })} placeholder="Nazwa firmy / osoby" editing={editing} inline />
                </div>
              </div>
              {editing ? (
                <Field value={v.status} onChange={(val) => update(v.id, { status: val })} editing={editing} inline options={["Szukam", "W rozmowie", "Zarezerwowany", "Odrzucony"]} />
              ) : (
                <span className={"tag " + statusTag(v.status)}>{v.status}</span>
              )}
            </div>
            <div className="row" style={{ gridTemplateColumns: "100px 1fr", padding: "8px 0" }}>
              <div className="row__label" style={{ padding: 0 }}>Kontakt</div>
              <Field value={v.contact} onChange={(val) => update(v.id, { contact: val })} placeholder="email lub strona" editing={editing} inline />
            </div>
            <div className="row" style={{ gridTemplateColumns: "100px 1fr", padding: "8px 0" }}>
              <div className="row__label" style={{ padding: 0 }}>Telefon</div>
              <Field value={v.phone} onChange={(val) => update(v.id, { phone: val })} placeholder="+48…" editing={editing} inline />
            </div>
            <div className="row" style={{ gridTemplateColumns: "100px 1fr", padding: "8px 0" }}>
              <div className="row__label" style={{ padding: 0 }}>Cena</div>
              <Field value={v.price} onChange={(val) => update(v.id, { price: val })} placeholder="—" editing={editing} inline suffix={v.price ? " zł" : ""} />
            </div>
            <div className="row" style={{ gridTemplateColumns: "100px 1fr", padding: "8px 0", borderBottom: "none" }}>
              <div className="row__label" style={{ padding: 0 }}>Notatki</div>
              <Field value={v.notes} onChange={(val) => update(v.id, { notes: val })} placeholder="Dodatkowe uwagi…" editing={editing} multiline />
            </div>
            {editing && (
              <div style={{ marginTop: 12, textAlign: "right" }}>
                <button className="btn btn--ghost btn--small" onClick={() => remove(v.id)}>
                  <Icon name="trash" size={12} /> Usuń
                </button>
              </div>
            )}
          </div>
        ))}
        {editing && (
          <button className="card" onClick={add} style={{ border: "1px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, cursor: "pointer", background: "transparent" }}>
            <div style={{ textAlign: "center" }}>
              <Icon name="plus" size={28} />
              <div className="mono muted mt-8">Nowy dostawca</div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

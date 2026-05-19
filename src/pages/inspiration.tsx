// Moodboard — inspiracje wizualne
import React from "react";
import { Field, Icon } from "../core";
import type { AppData, PageProps } from "../core";
import { PageHeader } from "./_shared";

export function PageInspiration({ data, set, editing }: PageProps) {
  const add = () => set((d: AppData) => ({
    ...d,
    inspiration: [...d.inspiration, { id: "i" + Date.now(), label: "", note: "" }],
  }));
  const remove = (id: string) => set((d: AppData) => ({ ...d, inspiration: d.inspiration.filter(i => i.id !== id) }));
  const update = (id: string, patch: Partial<AppData["inspiration"][number]>) => set((d: AppData) => ({
    ...d,
    inspiration: d.inspiration.map(i => i.id === id ? { ...i, ...patch } : i),
  }));

  return (
    <div className="page">
      <PageHeader
        eyebrow="10 — Moodboard"
        title="Inspiracje"
        sub="Wszystko, co ma być na ślubie: kwiaty, dekoracje, kolory, faktury."
        stats={[{ num: data.inspiration.length, label: "Pomysłów" }]}
      />

      <div className="mood">
        {data.inspiration.map(i => (
          <div className="mood-card" key={i.id}>
            <div className="mood-img">[ zrzut / zdjęcie ]</div>
            <div className="mood-meta">
              <div className="mood-meta__label">Kategoria</div>
              <div className="serif-italic" style={{ fontSize: 18, marginBottom: 6 }}>
                <Field value={i.label} onChange={(v) => update(i.id, { label: v })} placeholder="np. Bukiet" editing={editing} inline />
              </div>
              <Field value={i.note} onChange={(v) => update(i.id, { note: v })} placeholder="Opis, link, kolor, faktura…" editing={editing} multiline={editing} />
              {editing && (
                <button className="btn btn--ghost btn--small mt-8" onClick={() => remove(i.id)}>
                  <Icon name="trash" size={12} /> Usuń
                </button>
              )}
            </div>
          </div>
        ))}
        {editing && (
          <button className="mood-card" onClick={add} style={{ border: "1px dashed var(--line)", cursor: "pointer", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280 }}>
            <Icon name="plus" size={28} />
            <div className="mono muted mt-8">Nowa inspiracja</div>
          </button>
        )}
      </div>
    </div>
  );
}

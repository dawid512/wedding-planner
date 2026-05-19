// Menu & Tort — karta dań weselnych
import React from "react";
import { Field } from "../core";
import type { AppData, PageProps } from "../core";
import { PageHeader } from "./_shared";

type MenuKey = "welcome" | "soup" | "main" | "main2" | "dessert" | "cake" | "drinks" | "midnight" | "notes";

export function PageMenu({ data, set, editing }: PageProps) {
  const update = (key: MenuKey, value: string) => set((d: AppData) => ({ ...d, menu: { ...d.menu, [key]: value } }));
  const m = data.menu;

  const items: [MenuKey, string][] = [
    ["welcome", "Powitanie / aperitif"],
    ["soup", "Zupa"],
    ["main", "Danie główne I"],
    ["main2", "Danie główne II"],
    ["dessert", "Deser"],
    ["cake", "Tort weselny"],
    ["drinks", "Napoje / alkohole"],
    ["midnight", "Ciepły posiłek wieczorny"],
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="08 — Menu &amp; Tort"
        title="Co podajemy"
        sub="Karta dań na cały dzień. Drobny detal, na który pamiętają wszyscy goście."
      />

      <div className="grid grid--2">
        <div className="card">
          <div className="section__h">
            <h2 className="section__title">Menu weselne</h2>
          </div>
          {items.map(([key, label]) => (
            <div className="row" key={key} style={{ gridTemplateColumns: "180px 1fr" }}>
              <div className="row__label">{label}</div>
              <div className="serif-italic" style={{ fontSize: 16 }}>
                <Field value={m[key]} onChange={(v) => update(key, v)} placeholder="np. krem z borowików z grzanką" editing={editing} multiline={editing} />
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="card mb-24">
            <div className="placeholder-img" style={{ aspectRatio: "1 / 1", minHeight: 0 }}>
              [ zdjęcie tortu / inspiracja ]
            </div>
            <div className="row" style={{ borderBottom: "none", paddingTop: 16 }}>
              <div className="row__label">Notatki o torcie</div>
              <div>
                <Field value={m.notes} onChange={(v) => update("notes", v)} placeholder="Smak, kształt, kolory, liczba pięter, dekoracja…" editing={editing} multiline />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

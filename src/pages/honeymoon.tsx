// Podróż poślubna — kierunek, hotel, loty, plan
import React from "react";
import { Field } from "../core";
import type { AppData, PageProps } from "../core";
import { PageHeader } from "./_shared";

type HoneymoonKey = "destination" | "dates" | "hotel" | "flights" | "budget" | "activities" | "notes";

export function PageHoneymoon({ data, set, editing }: PageProps) {
  const update = (key: HoneymoonKey, value: string) => set((d: AppData) => ({ ...d, honeymoon: { ...d.honeymoon, [key]: value } }));
  const h = data.honeymoon;

  return (
    <div className="page">
      <PageHeader
        eyebrow="12 — Po ślubie"
        title="Podróż poślubna"
        sub="Kierunek, daty, loty, hotel i lista rzeczy do zrobienia w miejscu docelowym."
      />

      <div className="grid grid--2">
        <div>
          <div className="placeholder-img" style={{ minHeight: 320 }}>
            [ zdjęcie kierunku / mapa ]
          </div>
        </div>
        <div className="card">
          <div className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="row__label">Kierunek</div>
            <div className="serif-italic" style={{ fontSize: 24 }}>
              <Field value={h.destination} onChange={(v) => update("destination", v)} placeholder="np. Santorini, Grecja" editing={editing} inline />
            </div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="row__label">Daty</div>
            <Field value={h.dates} onChange={(v) => update("dates", v)} placeholder="np. 20-30 września" editing={editing} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="row__label">Loty</div>
            <Field value={h.flights} onChange={(v) => update("flights", v)} placeholder="numer lotu, linia, terminy" editing={editing} multiline={editing} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="row__label">Hotel</div>
            <Field value={h.hotel} onChange={(v) => update("hotel", v)} placeholder="nazwa hotelu, adres" editing={editing} multiline={editing} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="row__label">Budżet</div>
            <Field value={h.budget} onChange={(v) => update("budget", v)} placeholder="—" editing={editing} suffix={h.budget ? " zł" : ""} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "140px 1fr", borderBottom: "none" }}>
            <div className="row__label">Plan dnia / atrakcje</div>
            <Field value={h.activities} onChange={(v) => update("activities", v)} placeholder="Co chcemy zobaczyć / zrobić" editing={editing} multiline />
          </div>
        </div>
      </div>

      <div className="card mt-24">
        <div className="section__h">
          <h2 className="section__title">Notatki</h2>
        </div>
        <Field value={h.notes} onChange={(v) => update("notes", v)} placeholder="Dokumenty, ubezpieczenie, pakowanie, transfery…" editing={editing} multiline />
      </div>
    </div>
  );
}

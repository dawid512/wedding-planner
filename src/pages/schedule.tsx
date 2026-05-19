// Harmonogram — plan dnia ślubu
import React from "react";
import { Field, Icon } from "../core";
import type { AppData, PageProps } from "../core";
import { PageHeader } from "./_shared";

export function PageSchedule({ data, set, editing }: PageProps) {
  const add = () => set((d: AppData) => ({
    ...d,
    schedule: [...d.schedule, { id: "s" + Date.now(), time: "", title: "", note: "" }],
  }));
  const remove = (id: string) => set((d: AppData) => ({ ...d, schedule: d.schedule.filter(s => s.id !== id) }));
  const update = (id: string, patch: Partial<AppData["schedule"][number]>) => set((d: AppData) => ({
    ...d,
    schedule: d.schedule.map(s => s.id === id ? { ...s, ...patch } : s),
  }));

  return (
    <div className="page">
      <PageHeader
        eyebrow="07 — Harmonogram"
        title="Plan dnia ślubu"
        sub="Od przygotowań po pierwszy taniec i poprawiny. Godziny, miejsca i notatki dla każdego punktu."
      />

      <div className="card">
        <div className="timeline">
          {data.schedule.map(s => (
            <div key={s.id} className="tl-row">
              <div className="tl-time">
                <Field value={s.time} onChange={(v) => update(s.id, { time: v })} placeholder="--:--" editing={editing} inline />
              </div>
              <div>
                <div className="tl-title">
                  <Field value={s.title} onChange={(v) => update(s.id, { title: v })} placeholder="Nazwa punktu" editing={editing} inline />
                </div>
                <div className="tl-note">
                  <Field value={s.note} onChange={(v) => update(s.id, { note: v })} placeholder="Miejsce, osoby, uwagi…" editing={editing} multiline={editing} />
                </div>
              </div>
              {editing && (
                <button className="btn btn--ghost btn--icon" onClick={() => remove(s.id)}>
                  <Icon name="trash" />
                </button>
              )}
            </div>
          ))}
        </div>
        {editing && (
          <div className="add-row">
            <button className="btn btn--small" onClick={add}>
              <Icon name="plus" size={12} /> Dodaj punkt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

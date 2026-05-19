// Prezenty — lista życzeń i status
import React from "react";
import { Field, Icon } from "../core";
import type { AppData, PageProps } from "../core";
import { PageHeader } from "./_shared";

export function PageGifts({ data, set, editing }: PageProps) {
  const add = () => set((d: AppData) => ({
    ...d,
    gifts: [...d.gifts, { id: "gi" + Date.now(), item: "", from: "", status: "Życzenie" }],
  }));
  const remove = (id: string) => set((d: AppData) => ({ ...d, gifts: d.gifts.filter(g => g.id !== id) }));
  const update = (id: string, patch: Partial<AppData["gifts"][number]>) => set((d: AppData) => ({
    ...d,
    gifts: d.gifts.map(g => g.id === id ? { ...g, ...patch } : g),
  }));

  const statusTag = (s: string): string => {
    if (s === "Otrzymany") return "tag--ok";
    if (s === "Zarezerwowany") return "tag--accent";
    return "tag--warn";
  };

  const total = data.gifts.length;
  const got   = data.gifts.filter(g => g.status === "Otrzymany").length;

  return (
    <div className="page">
      <PageHeader
        eyebrow="11 — Prezenty"
        title="Lista prezentów"
        sub="Nasze życzenia, status (czy ktoś już zarezerwował) oraz od kogo trafił do nas konkretny prezent."
        stats={[
          { num: total, label: "Pozycji" },
          { num: got, label: "Otrzymane" },
        ]}
      />

      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Pozycja</th>
              <th>Od kogo</th>
              <th>Status</th>
              {editing && <th></th>}
            </tr>
          </thead>
          <tbody>
            {data.gifts.map((g, i) => (
              <tr key={g.id}>
                <td className="mono muted">{String(i + 1).padStart(2, "0")}</td>
                <td>
                  <Field value={g.item} onChange={(v) => update(g.id, { item: v })} placeholder="np. zestaw porcelany" editing={editing} inline />
                </td>
                <td>
                  <Field value={g.from} onChange={(v) => update(g.id, { from: v })} placeholder="imię/imiona" editing={editing} inline />
                </td>
                <td>
                  <Field value={g.status} onChange={(v) => update(g.id, { status: v })} editing={editing} inline options={["Życzenie", "Zarezerwowany", "Otrzymany"]} />
                  {!editing && <span className={"tag " + statusTag(g.status)}>{g.status}</span>}
                </td>
                {editing && (
                  <td>
                    <button className="btn btn--ghost btn--icon" onClick={() => remove(g.id)}>
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
            <button className="btn btn--small" onClick={add}>
              <Icon name="plus" size={12} /> Dodaj pozycję
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

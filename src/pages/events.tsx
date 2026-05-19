// Wydarzenia — wieczory kawalerski/panieński, ceremonia, wesele
import React from "react";
import { Field, Icon } from "../core";
import type { AppData, PageProps } from "../core";
import { PageHeader } from "./_shared";

export function PageEvents({ data, set, editing }: PageProps) {
  const events = data.events || [];
  const add = () => set((d: AppData) => ({
    ...d,
    events: [...(d.events || []), { id: "ev" + Date.now(), name: "", date: "", location: "", note: "", done: false }],
  }));
  const remove = (id: string) => set((d: AppData) => ({ ...d, events: d.events.filter(e => e.id !== id) }));
  const update = (id: string, patch: Partial<AppData["events"][number]>) => set((d: AppData) => ({
    ...d,
    events: d.events.map(e => e.id === id ? { ...e, ...patch } : e),
  }));

  const done     = events.filter(e => e.done).length;
  const upcoming = events.filter(e => e.date && !e.done).length;

  return (
    <div className="page">
      <PageHeader
        eyebrow="03 — Wydarzenia"
        title="Wszystkie okazje"
        sub="Wieczory kawalerski i panieński, ceremonia, wesele, poprawiny — terminy, miejsca, notatki."
        stats={[
          { num: events.length, label: "Wydarzeń" },
          { num: upcoming, label: "Nadchodzące" },
          { num: done, label: "Za nami" },
        ]}
      />

      <div className="grid grid--2">
        {events.map(e => (
          <div className="card" key={e.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--line-soft)" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>Wydarzenie</div>
                <div className="serif-italic" style={{ fontSize: 26, fontStyle: "italic", lineHeight: 1.1 }}>
                  <Field value={e.name} onChange={(v) => update(e.id, { name: v })} placeholder="Nazwa wydarzenia" editing={editing} inline />
                </div>
              </div>
              <button
                className={"tag " + (e.done ? "tag--ok" : "tag--warn")}
                onClick={() => update(e.id, { done: !e.done })}
                style={{ border: "none", cursor: "pointer" }}
              >
                {e.done ? "Za nami ✓" : "Przed nami"}
              </button>
            </div>
            <div className="row" style={{ gridTemplateColumns: "100px 1fr", padding: "8px 0" }}>
              <div className="row__label" style={{ padding: 0 }}>Data / godz.</div>
              {editing ? (
                <input
                  type="datetime-local"
                  value={e.date || ""}
                  onChange={(ev) => update(e.id, { date: ev.target.value })}
                  className="field__input"
                />
              ) : (
                <span className="serif-italic" style={{ fontSize: 16 }}>
                  {e.date ? new Date(e.date).toLocaleString("pl-PL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
              )}
            </div>
            <div className="row" style={{ gridTemplateColumns: "100px 1fr", padding: "8px 0" }}>
              <div className="row__label" style={{ padding: 0 }}>Miejsce</div>
              <Field value={e.location} onChange={(v) => update(e.id, { location: v })} placeholder="adres, lokal…" editing={editing} />
            </div>
            <div className="row" style={{ gridTemplateColumns: "100px 1fr", padding: "8px 0", borderBottom: "none" }}>
              <div className="row__label" style={{ padding: 0 }}>Notatki</div>
              <Field value={e.note} onChange={(v) => update(e.id, { note: v })} placeholder="goście, dress code, plan…" editing={editing} multiline />
            </div>
            {editing && (
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <button className="btn btn--ghost btn--small" onClick={() => remove(e.id)}>
                  <Icon name="trash" size={12} /> Usuń
                </button>
              </div>
            )}
          </div>
        ))}
        {editing && (
          <button
            className="card"
            onClick={add}
            style={{ border: "1px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, cursor: "pointer", background: "transparent" }}
          >
            <div style={{ textAlign: "center" }}>
              <Icon name="plus" size={28} />
              <div className="mono muted mt-8">Nowe wydarzenie</div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

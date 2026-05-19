// Zadania — lista zadań z kategoriami, priorytetami i terminami
import React from "react";
import { Field, Check, Icon, fmtDate } from "../core";
import type { AppData, PageProps } from "../core";
import { PageHeader } from "./_shared";

export function PageTasks({ data, set, editing }: PageProps) {
  const addTask = () => set((d: AppData) => ({
    ...d,
    tasks: [...d.tasks, { id: "t" + Date.now(), title: "", due: "", done: false, category: "Organizacja", priority: "Średni" }],
  }));
  const removeTask = (id: string) => set((d: AppData) => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }));
  const updateTask = (id: string, patch: Partial<AppData["tasks"][number]>) => set((d: AppData) => ({
    ...d,
    tasks: d.tasks.map(t => t.id === id ? { ...t, ...patch } : t),
  }));

  const total = data.tasks.length;
  const done  = data.tasks.filter(t => t.done).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="page">
      <PageHeader
        eyebrow="02 — Lista zadań"
        title="Co jeszcze do zrobienia"
        sub="Wszystkie kroki do uporządkowania. Odhaczaj, dodawaj kategorie i terminy."
        stats={[
          { num: done,          label: "Ukończone" },
          { num: total - done,  label: "Pozostało" },
          { num: pct + "%",     label: "Postęp" },
        ]}
      />

      <div className="card">
        {data.tasks.map(t => {
          const prioTag = t.priority === "Wysoki" ? "tag--no" : t.priority === "Niski" ? "tag" : "tag--warn";
          return (
            <div key={t.id} className={"task " + (t.done ? "task--done" : "")}
              style={{ gridTemplateColumns: "24px 1fr auto auto auto" + (editing ? " auto" : "") }}>
              <Check on={t.done} onClick={() => updateTask(t.id, { done: !t.done })} />
              <div className="task__title">
                <Field value={t.title} onChange={(v) => updateTask(t.id, { title: v })} placeholder="Nazwa zadania…" editing={editing} inline />
              </div>
              <div>
                <Field value={t.priority} onChange={(v) => updateTask(t.id, { priority: v })} editing={editing} inline
                  options={["Wysoki", "Średni", "Niski"]} />
                {!editing && t.priority && <span className={"tag " + prioTag}>{t.priority}</span>}
              </div>
              <div>
                <Field value={t.category} onChange={(v) => updateTask(t.id, { category: v })} editing={editing} inline
                  options={["Organizacja", "Sala", "Stroje", "Goście", "Dostawcy", "Dokumenty", "Inne"]} />
                {!editing && <span className="tag">{t.category}</span>}
              </div>
              <div className="task__due">
                {editing ? (
                  <input type="date" value={t.due || ""} onChange={(e) => updateTask(t.id, { due: e.target.value })}
                    className="field__input" style={{ minWidth: 140 }} />
                ) : (t.due ? fmtDate(t.due) : "—")}
              </div>
              {editing && (
                <button className="btn btn--ghost btn--icon" onClick={() => removeTask(t.id)} title="Usuń">
                  <Icon name="trash" />
                </button>
              )}
            </div>
          );
        })}
        {editing && (
          <div className="add-row">
            <button className="btn btn--small" onClick={addTask}>
              <Icon name="plus" size={12} /> Dodaj zadanie
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

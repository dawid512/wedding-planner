// Muzyka — kluczowe momenty, playlista, zakazy, dedykacje
import React from "react";
import { Field, Icon } from "../core";
import type { AppData, PageProps } from "../core";
import { PageHeader } from "./_shared";

type MusicListKey   = "playlist" | "blacklist" | "dedications";
type MusicScalarKey = "firstDance" | "firstDanceArtist" | "entrance" | "cake" | "bouquet" | "lastDance" | "notes";

export function PageMusic({ data, set, editing }: PageProps) {
  const m = data.music;
  const upd = (key: MusicScalarKey, value: string) => set((d: AppData) => ({ ...d, music: { ...d.music, [key]: value } }));

  const updateList = (listKey: MusicListKey, id: string, patch: Record<string, string>) => set((d: AppData) => ({
    ...d,
    music: { ...d.music, [listKey]: (d.music[listKey] as Array<Record<string, string>>).map(x => x.id === id ? { ...x, ...patch } : x) },
  }));
  const addList = (listKey: MusicListKey, template: Record<string, string>) => set((d: AppData) => ({
    ...d,
    music: {
      ...d.music,
      [listKey]: [...(d.music[listKey] as Array<Record<string, string>>), { id: listKey.slice(0, 2) + Date.now(), ...template }],
    },
  }));
  const removeList = (listKey: MusicListKey, id: string) => set((d: AppData) => ({
    ...d,
    music: { ...d.music, [listKey]: (d.music[listKey] as Array<Record<string, string>>).filter(x => x.id !== id) },
  }));

  const moments: [MusicScalarKey, string][] = [
    ["firstDance", "Pierwszy taniec"],
    ["entrance", "Wejście pary młodej"],
    ["cake", "Krojenie tortu"],
    ["bouquet", "Rzucanie bukietu"],
    ["lastDance", "Ostatni taniec"],
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="11 — Muzyka"
        title="Ścieżka dźwiękowa"
        sub="Kluczowe momenty, playlista życzeń, utwory zakazane oraz dedykacje od gości."
        stats={[
          { num: m.playlist.filter(p => p.title).length, label: "Na playliście" },
          { num: m.blacklist.filter(p => p.title).length, label: "Zakazane" },
          { num: m.dedications.filter(p => p.song).length, label: "Dedykacje" },
        ]}
      />

      <div className="section">
        <div className="section__h">
          <h2 className="section__title">Kluczowe momenty</h2>
          <span className="section__hint">Utwory dla DJ-a</span>
        </div>
        <div className="card">
          {moments.map(([key, label]) => (
            <div className="row" key={key} style={{ gridTemplateColumns: "200px 1fr" }}>
              <div className="row__label">{label}</div>
              <div className="serif-italic" style={{ fontSize: 18, fontStyle: "italic" }}>
                <Field value={m[key]} onChange={(v) => upd(key, v)} placeholder="np. Ed Sheeran — Perfect" editing={editing} inline />
                {key === "firstDance" && (
                  <div style={{ marginTop: 6 }}>
                    <span className="mono muted" style={{ fontSize: 10, marginRight: 6 }}>WYKONAWCA:</span>
                    <Field value={m.firstDanceArtist} onChange={(v) => upd("firstDanceArtist", v)} placeholder="—" editing={editing} inline />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid--2">
        <div className="section" style={{ marginBottom: 0 }}>
          <div className="section__h">
            <h2 className="section__title">Playlista życzeń</h2>
            <span className="section__hint">co MA zagrać</span>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Tytuł</th>
                  <th>Wykonawca</th>
                  {editing && <th></th>}
                </tr>
              </thead>
              <tbody>
                {m.playlist.map((p, i) => (
                  <tr key={p.id}>
                    <td className="mono muted">{String(i + 1).padStart(2, "0")}</td>
                    <td><Field value={p.title} onChange={(v) => updateList("playlist", p.id, { title: v })} placeholder="np. September" editing={editing} inline /></td>
                    <td><Field value={p.artist} onChange={(v) => updateList("playlist", p.id, { artist: v })} placeholder="Earth, Wind &amp; Fire" editing={editing} inline /></td>
                    {editing && (
                      <td><button className="btn btn--ghost btn--icon" onClick={() => removeList("playlist", p.id)}><Icon name="trash" /></button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {editing && (
              <div className="add-row" style={{ padding: "12px 14px" }}>
                <button className="btn btn--small" onClick={() => addList("playlist", { title: "", artist: "" })}>
                  <Icon name="plus" size={12} /> Dodaj utwór
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="section" style={{ marginBottom: 0 }}>
          <div className="section__h">
            <h2 className="section__title">Utwory zakazane</h2>
            <span className="section__hint">czego NIE grać</span>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Tytuł</th>
                  <th>Wykonawca</th>
                  {editing && <th></th>}
                </tr>
              </thead>
              <tbody>
                {m.blacklist.map((p, i) => (
                  <tr key={p.id}>
                    <td className="mono muted">{String(i + 1).padStart(2, "0")}</td>
                    <td><Field value={p.title} onChange={(v) => updateList("blacklist", p.id, { title: v })} placeholder="—" editing={editing} inline /></td>
                    <td><Field value={p.artist} onChange={(v) => updateList("blacklist", p.id, { artist: v })} placeholder="—" editing={editing} inline /></td>
                    {editing && (
                      <td><button className="btn btn--ghost btn--icon" onClick={() => removeList("blacklist", p.id)}><Icon name="trash" /></button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {editing && (
              <div className="add-row" style={{ padding: "12px 14px" }}>
                <button className="btn btn--small" onClick={() => addList("blacklist", { title: "", artist: "" })}>
                  <Icon name="plus" size={12} /> Dodaj utwór
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section mt-24">
        <div className="section__h">
          <h2 className="section__title">Dedykacje gości</h2>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Utwór</th>
                <th>Od kogo</th>
                <th>Komentarz</th>
                {editing && <th></th>}
              </tr>
            </thead>
            <tbody>
              {m.dedications.map(d => (
                <tr key={d.id}>
                  <td><Field value={d.song} onChange={(v) => updateList("dedications", d.id, { song: v })} placeholder="utwór" editing={editing} inline /></td>
                  <td><Field value={d.from} onChange={(v) => updateList("dedications", d.id, { from: v })} placeholder="imię gościa" editing={editing} inline /></td>
                  <td><Field value={d.note} onChange={(v) => updateList("dedications", d.id, { note: v })} placeholder="dla kogo / dlaczego" editing={editing} inline /></td>
                  {editing && (
                    <td><button className="btn btn--ghost btn--icon" onClick={() => removeList("dedications", d.id)}><Icon name="trash" /></button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {editing && (
            <div className="add-row" style={{ padding: "12px 14px" }}>
              <button className="btn btn--small" onClick={() => addList("dedications", { song: "", from: "", note: "" })}>
                <Icon name="plus" size={12} /> Dodaj dedykację
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card mt-24">
        <div className="row" style={{ gridTemplateColumns: "180px 1fr", borderBottom: "none", padding: "8px 0" }}>
          <div className="row__label">Notatki dla DJ-a</div>
          <Field value={m.notes} onChange={(v) => upd("notes", v)} placeholder="Styl, atmosfera, godziny pauzy, anonse…" editing={editing} multiline />
        </div>
      </div>
    </div>
  );
}

// Formalności — dokumenty USC, świadkowie, ceremonia
import React from "react";
import { Field, Icon, fmtDate } from "../core";
import type { AppData, PageProps } from "../core";
import { PageHeader, DateInput } from "./_shared";

type PersonKey   = "bride" | "groom";
type WitnessKey  = "witness1" | "witness2";
type PersonField = "fullName" | "birthDate" | "birthPlace" | "address" | "id" | "parents";
type CeremonyField = "type" | "venue" | "address" | "officiant" | "date" | "time";

export function PageDocuments({ data, set, editing }: PageProps) {
  const dd = data.documents;

  const updPerson = (who: PersonKey | WitnessKey, field: string, value: string) => set((d: AppData) => ({
    ...d,
    documents: { ...d.documents, [who]: { ...(d.documents as unknown as Record<string, Record<string, string>>)[who], [field]: value } },
  }));
  const updCeremony = (field: CeremonyField, value: string) => set((d: AppData) => ({
    ...d,
    documents: { ...d.documents, ceremony: { ...d.documents.ceremony, [field]: value } },
  }));
  const updDoc = (id: string, patch: Partial<AppData["documents"]["docs"][number]>) => set((d: AppData) => ({
    ...d,
    documents: { ...d.documents, docs: d.documents.docs.map(x => x.id === id ? { ...x, ...patch } : x) },
  }));
  const addDoc = () => set((d: AppData) => ({
    ...d,
    documents: { ...d.documents, docs: [...d.documents.docs, { id: "doc" + Date.now(), name: "", status: "Do zebrania", note: "" }] },
  }));
  const removeDoc = (id: string) => set((d: AppData) => ({
    ...d,
    documents: { ...d.documents, docs: d.documents.docs.filter(x => x.id !== id) },
  }));

  const personFields: [PersonField, string][] = [
    ["fullName",   "Imię i nazwisko"],
    ["birthDate",  "Data urodzenia"],
    ["birthPlace", "Miejsce urodzenia"],
    ["address",    "Adres zameldowania"],
    ["id",         "Numer dokumentu"],
    ["parents",    "Imiona rodziców"],
  ];

  const docs  = dd.docs || [];
  const ready = docs.filter(d => d.status === "Gotowe").length;

  const statusTag = (s: string): string => {
    if (s === "Gotowe") return "tag--ok";
    if (s === "W trakcie") return "tag--warn";
    return "";
  };

  const ddAsRecord = dd as unknown as Record<string, Record<string, string>>;

  return (
    <div className="page">
      <PageHeader
        eyebrow="13 — Formalności"
        title="Dokumenty &amp; USC"
        sub="Dane do USC / parafii, świadkowie i lista dokumentów do skompletowania."
        stats={[
          { num: ready, label: "Gotowe" },
          { num: docs.length - ready, label: "W toku" },
          { num: docs.length, label: "Razem" },
        ]}
      />

      <div className="section">
        <div className="section__h">
          <h2 className="section__title">Ceremonia</h2>
        </div>
        <div className="card">
          <div className="row" style={{ gridTemplateColumns: "180px 1fr" }}>
            <div className="row__label">Rodzaj</div>
            <Field value={dd.ceremony?.type} onChange={(v) => updCeremony("type", v)} editing={editing} inline options={["Cywilny (USC)", "Konkordatowy (kościół)", "Wyznaniowy", "Symboliczny / plenerowy"]} />
            {!editing && dd.ceremony?.type && <span className="serif-italic" style={{ fontSize: 17 }}>{dd.ceremony?.type}</span>}
          </div>
          <div className="row" style={{ gridTemplateColumns: "180px 1fr" }}>
            <div className="row__label">Miejsce</div>
            <Field value={dd.ceremony?.venue} onChange={(v) => updCeremony("venue", v)} placeholder="USC nr… / parafia…" editing={editing} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "180px 1fr" }}>
            <div className="row__label">Adres</div>
            <Field value={dd.ceremony?.address} onChange={(v) => updCeremony("address", v)} placeholder="ul. ..., kod, miasto" editing={editing} multiline={editing} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "180px 1fr" }}>
            <div className="row__label">Osoba prowadząca</div>
            <Field value={dd.ceremony?.officiant} onChange={(v) => updCeremony("officiant", v)} placeholder="ks. / urzędnik USC" editing={editing} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "180px 1fr" }}>
            <div className="row__label">Data</div>
            {editing ? (
              <DateInput value={dd.ceremony?.date || ""} onChange={(v) => updCeremony("date", v)} />
            ) : (
              <span>{dd.ceremony?.date ? fmtDate(dd.ceremony.date) : "—"}</span>
            )}
          </div>
          <div className="row" style={{ gridTemplateColumns: "180px 1fr", borderBottom: "none" }}>
            <div className="row__label">Godzina</div>
            {editing ? (
              <DateInput type="time" value={dd.ceremony?.time || ""} onChange={(v) => updCeremony("time", v)} />
            ) : (
              <span className="mono">{dd.ceremony?.time || "—"}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid--2">
        {(["bride", "groom"] as PersonKey[]).map((who) => (
          <div className="card" key={who}>
            <div className="section__h">
              <h2 className="section__title">{who === "bride" ? "Panna młoda" : "Pan młody"}</h2>
            </div>
            {personFields.map(([field, lbl]) => (
              <div key={field} className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
                <div className="row__label">{lbl}</div>
                {editing && field === "birthDate" ? (
                  <DateInput value={ddAsRecord[who]?.[field] || ""} onChange={(v) => updPerson(who, field, v)} />
                ) : (
                  <Field
                    value={ddAsRecord[who]?.[field]}
                    onChange={(v) => updPerson(who, field, v)}
                    placeholder={lbl.toLowerCase()}
                    editing={editing}
                    inline
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="grid grid--2 mt-24">
        {(["witness1", "witness2"] as WitnessKey[]).map((who) => (
          <div className="card" key={who}>
            <div className="section__h">
              <h2 className="section__title">{who === "witness1" ? "Świadek I" : "Świadek II"}</h2>
            </div>
            <div className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
              <div className="row__label">Imię i nazwisko</div>
              <Field value={ddAsRecord[who]?.name} onChange={(v) => updPerson(who, "name", v)} placeholder="—" editing={editing} />
            </div>
            <div className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
              <div className="row__label">Telefon</div>
              <Field value={ddAsRecord[who]?.phone} onChange={(v) => updPerson(who, "phone", v)} placeholder="+48…" editing={editing} />
            </div>
            <div className="row" style={{ gridTemplateColumns: "140px 1fr", borderBottom: "none" }}>
              <div className="row__label">Nr dokumentu</div>
              <Field value={ddAsRecord[who]?.id} onChange={(v) => updPerson(who, "id", v)} placeholder="—" editing={editing} />
            </div>
          </div>
        ))}
      </div>

      <div className="section mt-24">
        <div className="section__h">
          <h2 className="section__title">Dokumenty do skompletowania</h2>
          <span className="section__hint">{ready}/{docs.length} gotowych</span>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Dokument</th>
                <th style={{ width: 160 }}>Status</th>
                <th>Notatki</th>
                {editing && <th></th>}
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id}>
                  <td>
                    <Field value={d.name} onChange={(v) => updDoc(d.id, { name: v })} placeholder="np. Akt urodzenia" editing={editing} inline />
                  </td>
                  <td>
                    <Field value={d.status} onChange={(v) => updDoc(d.id, { status: v })} editing={editing} inline options={["Do zebrania", "W trakcie", "Gotowe"]} />
                    {!editing && <span className={"tag " + statusTag(d.status)}>{d.status}</span>}
                  </td>
                  <td>
                    <Field value={d.note} onChange={(v) => updDoc(d.id, { note: v })} placeholder="termin, miejsce odbioru…" editing={editing} inline />
                  </td>
                  {editing && (
                    <td><button className="btn btn--ghost btn--icon" onClick={() => removeDoc(d.id)}><Icon name="trash" /></button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {editing && (
            <div className="add-row" style={{ padding: "12px 14px" }}>
              <button className="btn btn--small" onClick={addDoc}><Icon name="plus" size={12} /> Dodaj dokument</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

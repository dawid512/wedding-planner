// Wedding Planner — page components (part 3 — extras from analysis)

import { Field as F3, Check as C3, Icon as I3, fmtCurrency as fmt$3, fmtDate as fmtD3 } from "./core";
import { PageHeader as PH3 } from "./pages-1";

// ============================================================
// EVENTS — kawalerski, panieński, ceremonia, wesele, poprawiny
// ============================================================
function PageEvents({ data, set, editing }) {
  const events = data.events || [];
  const add = () => set(d => ({
    ...d,
    events: [...(d.events || []), { id: "ev" + Date.now(), name: "", date: "", location: "", note: "", done: false }],
  }));
  const remove = (id) => set(d => ({ ...d, events: d.events.filter(e => e.id !== id) }));
  const update = (id, patch) => set(d => ({
    ...d,
    events: d.events.map(e => e.id === id ? { ...e, ...patch } : e),
  }));

  const done = events.filter(e => e.done).length;
  const upcoming = events.filter(e => e.date && !e.done).length;

  return (
    <div className="page">
      <PH3
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
                  <F3 value={e.name} onChange={(v) => update(e.id, { name: v })} placeholder="Nazwa wydarzenia" editing={editing} inline />
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
              <F3 value={e.location} onChange={(v) => update(e.id, { location: v })} placeholder="adres, lokal…" editing={editing} />
            </div>
            <div className="row" style={{ gridTemplateColumns: "100px 1fr", padding: "8px 0", borderBottom: "none" }}>
              <div className="row__label" style={{ padding: 0 }}>Notatki</div>
              <F3 value={e.note} onChange={(v) => update(e.id, { note: v })} placeholder="goście, dress code, plan…" editing={editing} multiline />
            </div>
            {editing && (
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <button className="btn btn--ghost btn--small" onClick={() => remove(e.id)}>
                  <I3 name="trash" size={12} /> Usuń
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
              <I3 name="plus" size={28} />
              <div className="mono muted mt-8">Nowe wydarzenie</div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MUSIC — first dance, playlist, blacklist, dedications
// ============================================================
function PageMusic({ data, set, editing }) {
  const m = data.music || {};
  const upd = (key, value) => set(d => ({ ...d, music: { ...d.music, [key]: value } }));

  const updateList = (listKey, id, patch) => set(d => ({
    ...d,
    music: { ...d.music, [listKey]: (d.music?.[listKey] || []).map(x => x.id === id ? { ...x, ...patch } : x) },
  }));
  const addList = (listKey, template) => set(d => ({
    ...d,
    music: {
      ...d.music,
      [listKey]: [...(d.music?.[listKey] || []), { id: listKey.slice(0, 2) + Date.now(), ...template }],
    },
  }));
  const removeList = (listKey, id) => set(d => ({
    ...d,
    music: { ...d.music, [listKey]: (d.music?.[listKey] || []).filter(x => x.id !== id) },
  }));

  const moments = [
    ["firstDance", "Pierwszy taniec"],
    ["entrance", "Wejście pary młodej"],
    ["cake", "Krojenie tortu"],
    ["bouquet", "Rzucanie bukietu"],
    ["lastDance", "Ostatni taniec"],
  ];

  return (
    <div className="page">
      <PH3
        eyebrow="11 — Muzyka"
        title="Ścieżka dźwiękowa"
        sub="Kluczowe momenty, playlista życzeń, utwory zakazane oraz dedykacje od gości."
        stats={[
          { num: (m.playlist || []).filter(p => p.title).length, label: "Na playliście" },
          { num: (m.blacklist || []).filter(p => p.title).length, label: "Zakazane" },
          { num: (m.dedications || []).filter(p => p.song).length, label: "Dedykacje" },
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
                <F3 value={m[key]} onChange={(v) => upd(key, v)} placeholder="np. Ed Sheeran — Perfect" editing={editing} inline />
                {key === "firstDance" && (
                  <div style={{ marginTop: 6 }}>
                    <span className="mono muted" style={{ fontSize: 10, marginRight: 6 }}>WYKONAWCA:</span>
                    <F3 value={m.firstDanceArtist} onChange={(v) => upd("firstDanceArtist", v)} placeholder="—" editing={editing} inline />
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
                {(m.playlist || []).map((p, i) => (
                  <tr key={p.id}>
                    <td className="mono muted">{String(i + 1).padStart(2, "0")}</td>
                    <td><F3 value={p.title} onChange={(v) => updateList("playlist", p.id, { title: v })} placeholder="np. September" editing={editing} inline /></td>
                    <td><F3 value={p.artist} onChange={(v) => updateList("playlist", p.id, { artist: v })} placeholder="Earth, Wind & Fire" editing={editing} inline /></td>
                    {editing && (
                      <td><button className="btn btn--ghost btn--icon" onClick={() => removeList("playlist", p.id)}><I3 name="trash" /></button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {editing && (
              <div className="add-row" style={{ padding: "12px 14px" }}>
                <button className="btn btn--small" onClick={() => addList("playlist", { title: "", artist: "" })}>
                  <I3 name="plus" size={12} /> Dodaj utwór
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
                {(m.blacklist || []).map((p, i) => (
                  <tr key={p.id}>
                    <td className="mono muted">{String(i + 1).padStart(2, "0")}</td>
                    <td><F3 value={p.title} onChange={(v) => updateList("blacklist", p.id, { title: v })} placeholder="—" editing={editing} inline /></td>
                    <td><F3 value={p.artist} onChange={(v) => updateList("blacklist", p.id, { artist: v })} placeholder="—" editing={editing} inline /></td>
                    {editing && (
                      <td><button className="btn btn--ghost btn--icon" onClick={() => removeList("blacklist", p.id)}><I3 name="trash" /></button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {editing && (
              <div className="add-row" style={{ padding: "12px 14px" }}>
                <button className="btn btn--small" onClick={() => addList("blacklist", { title: "", artist: "" })}>
                  <I3 name="plus" size={12} /> Dodaj utwór
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
              {(m.dedications || []).map(d => (
                <tr key={d.id}>
                  <td><F3 value={d.song} onChange={(v) => updateList("dedications", d.id, { song: v })} placeholder="utwór" editing={editing} inline /></td>
                  <td><F3 value={d.from} onChange={(v) => updateList("dedications", d.id, { from: v })} placeholder="imię gościa" editing={editing} inline /></td>
                  <td><F3 value={d.note} onChange={(v) => updateList("dedications", d.id, { note: v })} placeholder="dla kogo / dlaczego" editing={editing} inline /></td>
                  {editing && (
                    <td><button className="btn btn--ghost btn--icon" onClick={() => removeList("dedications", d.id)}><I3 name="trash" /></button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {editing && (
            <div className="add-row" style={{ padding: "12px 14px" }}>
              <button className="btn btn--small" onClick={() => addList("dedications", { song: "", from: "", note: "" })}>
                <I3 name="plus" size={12} /> Dodaj dedykację
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card mt-24">
        <div className="row" style={{ gridTemplateColumns: "180px 1fr", borderBottom: "none", padding: "8px 0" }}>
          <div className="row__label">Notatki dla DJ-a</div>
          <F3 value={m.notes} onChange={(v) => upd("notes", v)} placeholder="Styl, atmosfera, godziny pauzy, anonse…" editing={editing} multiline />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DOCUMENTS / USC
// ============================================================
function PageDocuments({ data, set, editing }) {
  const dd = data.documents || {};
  const updPerson = (who, field, value) => set(d => ({
    ...d,
    documents: { ...d.documents, [who]: { ...d.documents[who], [field]: value } },
  }));
  const updCeremony = (field, value) => set(d => ({
    ...d,
    documents: { ...d.documents, ceremony: { ...d.documents.ceremony, [field]: value } },
  }));
  const updDoc = (id, patch) => set(d => ({
    ...d,
    documents: { ...d.documents, docs: d.documents.docs.map(x => x.id === id ? { ...x, ...patch } : x) },
  }));
  const addDoc = () => set(d => ({
    ...d,
    documents: { ...d.documents, docs: [...d.documents.docs, { id: "doc" + Date.now(), name: "", status: "Do zebrania", note: "" }] },
  }));
  const removeDoc = (id) => set(d => ({
    ...d,
    documents: { ...d.documents, docs: d.documents.docs.filter(x => x.id !== id) },
  }));

  const personFields = [
    ["fullName", "Imię i nazwisko"],
    ["birthDate", "Data urodzenia"],
    ["birthPlace", "Miejsce urodzenia"],
    ["address", "Adres zameldowania"],
    ["id", "Numer dokumentu"],
    ["parents", "Imiona rodziców"],
  ];

  const docs = dd.docs || [];
  const ready = docs.filter(d => d.status === "Gotowe").length;

  const statusTag = (s) => {
    if (s === "Gotowe") return "tag--ok";
    if (s === "W trakcie") return "tag--warn";
    return "";
  };

  return (
    <div className="page">
      <PH3
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
            <F3 value={dd.ceremony?.type} onChange={(v) => updCeremony("type", v)} editing={editing} inline options={["Cywilny (USC)", "Konkordatowy (kościół)", "Wyznaniowy", "Symboliczny / plenerowy"]} />
            {!editing && dd.ceremony?.type && <span className="serif-italic" style={{ fontSize: 17 }}>{dd.ceremony?.type}</span>}
          </div>
          <div className="row" style={{ gridTemplateColumns: "180px 1fr" }}>
            <div className="row__label">Miejsce</div>
            <F3 value={dd.ceremony?.venue} onChange={(v) => updCeremony("venue", v)} placeholder="USC nr… / parafia…" editing={editing} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "180px 1fr" }}>
            <div className="row__label">Adres</div>
            <F3 value={dd.ceremony?.address} onChange={(v) => updCeremony("address", v)} placeholder="ul. ..., kod, miasto" editing={editing} multiline={editing} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "180px 1fr" }}>
            <div className="row__label">Osoba prowadząca</div>
            <F3 value={dd.ceremony?.officiant} onChange={(v) => updCeremony("officiant", v)} placeholder="ks. / urzędnik USC" editing={editing} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "180px 1fr" }}>
            <div className="row__label">Data</div>
            {editing ? (
              <input type="date" className="field__input" value={dd.ceremony?.date || ""} onChange={(e) => updCeremony("date", e.target.value)} />
            ) : (
              <span>{dd.ceremony?.date ? fmtD3(dd.ceremony.date) : "—"}</span>
            )}
          </div>
          <div className="row" style={{ gridTemplateColumns: "180px 1fr", borderBottom: "none" }}>
            <div className="row__label">Godzina</div>
            {editing ? (
              <input type="time" className="field__input" value={dd.ceremony?.time || ""} onChange={(e) => updCeremony("time", e.target.value)} />
            ) : (
              <span className="mono">{dd.ceremony?.time || "—"}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid--2">
        {[
          ["bride", "Panna młoda"],
          ["groom", "Pan młody"],
        ].map(([who, label]) => (
          <div className="card" key={who}>
            <div className="section__h">
              <h2 className="section__title">{label}</h2>
            </div>
            {personFields.map(([field, lbl]) => (
              <div key={field} className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
                <div className="row__label">{lbl}</div>
                {editing && field === "birthDate" ? (
                  <input type="date" className="field__input" value={dd[who]?.[field] || ""} onChange={(e) => updPerson(who, field, e.target.value)} />
                ) : (
                  <F3
                    value={dd[who]?.[field]}
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
        {[
          ["witness1", "Świadek I"],
          ["witness2", "Świadek II"],
        ].map(([who, label]) => (
          <div className="card" key={who}>
            <div className="section__h">
              <h2 className="section__title">{label}</h2>
            </div>
            <div className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
              <div className="row__label">Imię i nazwisko</div>
              <F3 value={dd[who]?.name} onChange={(v) => updPerson(who, "name", v)} placeholder="—" editing={editing} />
            </div>
            <div className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
              <div className="row__label">Telefon</div>
              <F3 value={dd[who]?.phone} onChange={(v) => updPerson(who, "phone", v)} placeholder="+48…" editing={editing} />
            </div>
            <div className="row" style={{ gridTemplateColumns: "140px 1fr", borderBottom: "none" }}>
              <div className="row__label">Nr dokumentu</div>
              <F3 value={dd[who]?.id} onChange={(v) => updPerson(who, "id", v)} placeholder="—" editing={editing} />
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
                    <F3 value={d.name} onChange={(v) => updDoc(d.id, { name: v })} placeholder="np. Akt urodzenia" editing={editing} inline />
                  </td>
                  <td>
                    <F3 value={d.status} onChange={(v) => updDoc(d.id, { status: v })} editing={editing} inline options={["Do zebrania", "W trakcie", "Gotowe"]} />
                    {!editing && <span className={"tag " + statusTag(d.status)}>{d.status}</span>}
                  </td>
                  <td>
                    <F3 value={d.note} onChange={(v) => updDoc(d.id, { note: v })} placeholder="termin, miejsce odbioru…" editing={editing} inline />
                  </td>
                  {editing && (
                    <td><button className="btn btn--ghost btn--icon" onClick={() => removeDoc(d.id)}><I3 name="trash" /></button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {editing && (
            <div className="add-row" style={{ padding: "12px 14px" }}>
              <button className="btn btn--small" onClick={addDoc}><I3 name="plus" size={12} /> Dodaj dokument</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAYMENTS — harmonogram zaliczek i płatności
// ============================================================
function PagePayments({ data, set, editing }) {
  const payments = data.payments || [];
  const add = () => set(d => ({
    ...d,
    payments: [...(d.payments || []), { id: "pay" + Date.now(), what: "", amount: "", dueDate: "", paid: false, paidDate: "", method: "Przelew", note: "" }],
  }));
  const remove = (id) => set(d => ({ ...d, payments: d.payments.filter(p => p.id !== id) }));
  const update = (id, patch) => set(d => ({
    ...d,
    payments: d.payments.map(p => p.id === id ? { ...p, ...patch } : p),
  }));

  const total = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const paid = payments.filter(p => p.paid).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const pending = total - paid;
  const today = new Date(); today.setHours(0,0,0,0);
  const overdue = payments.filter(p => !p.paid && p.dueDate && new Date(p.dueDate) < today).length;
  const upcoming7 = payments.filter(p => {
    if (p.paid || !p.dueDate) return false;
    const d = new Date(p.dueDate);
    const diff = (d - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 14;
  }).length;

  return (
    <div className="page">
      <PH3
        eyebrow="05 — Płatności"
        title="Harmonogram opłat"
        sub="Zaliczki, raty końcowe. Sortuje się wg terminu, podświetla przeterminowane."
        stats={[
          { num: paid ? fmt$3(paid) : "—", label: "Zapłacono" },
          { num: pending ? fmt$3(pending) : "—", label: "Do zapłaty" },
          { num: upcoming7, label: "Najbliższe 14 dni" },
          { num: overdue, label: "Przeterminowane" },
        ]}
      />

      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Co</th>
              <th className="num" style={{ width: 110 }}>Kwota</th>
              <th style={{ width: 140 }}>Termin</th>
              <th style={{ width: 130 }}>Metoda</th>
              <th>Notatki</th>
              <th style={{ width: 110 }}>Status</th>
              {editing && <th style={{ width: 36 }}></th>}
            </tr>
          </thead>
          <tbody>
            {payments.map(p => {
              const isOverdue = !p.paid && p.dueDate && new Date(p.dueDate) < today;
              const isSoon = !p.paid && p.dueDate && (new Date(p.dueDate) - today) / (1000 * 60 * 60 * 24) <= 7 && new Date(p.dueDate) >= today;
              return (
                <tr key={p.id} style={isOverdue ? { background: "oklch(0.96 0.04 28 / 0.5)" } : {}}>
                  <td>
                    <F3 value={p.what} onChange={(v) => update(p.id, { what: v })} placeholder="np. Zaliczka — sala" editing={editing} inline />
                  </td>
                  <td className="num">
                    <F3 value={p.amount} onChange={(v) => update(p.id, { amount: v })} placeholder="—" editing={editing} inline type="number" suffix=" zł" />
                  </td>
                  <td>
                    {editing ? (
                      <input type="date" className="field__input" value={p.dueDate || ""} onChange={(e) => update(p.id, { dueDate: e.target.value })} />
                    ) : (
                      <span style={{ color: isOverdue ? "oklch(0.55 0.15 28)" : isSoon ? "var(--accent)" : undefined }}>
                        {p.dueDate ? fmtD3(p.dueDate) : "—"}
                        {isOverdue && <span className="tag tag--no" style={{ marginLeft: 6, fontSize: 9 }}>po terminie</span>}
                        {isSoon && <span className="tag tag--warn" style={{ marginLeft: 6, fontSize: 9 }}>wkrótce</span>}
                      </span>
                    )}
                  </td>
                  <td>
                    <F3 value={p.method} onChange={(v) => update(p.id, { method: v })} editing={editing} inline options={["Przelew", "Gotówka", "BLIK", "Karta"]} />
                  </td>
                  <td>
                    <F3 value={p.note} onChange={(v) => update(p.id, { note: v })} placeholder="numer konta, tytuł przelewu…" editing={editing} inline />
                  </td>
                  <td>
                    <button
                      className={"tag " + (p.paid ? "tag--ok" : "tag--warn")}
                      onClick={() => update(p.id, { paid: !p.paid, paidDate: !p.paid ? new Date().toISOString().slice(0, 10) : "" })}
                      style={{ border: "none", cursor: "pointer" }}
                    >
                      {p.paid ? "Zapłacone ✓" : "Oczekuje"}
                    </button>
                  </td>
                  {editing && (
                    <td>
                      <button className="btn btn--ghost btn--icon" onClick={() => remove(p.id)}><I3 name="trash" /></button>
                    </td>
                  )}
                </tr>
              );
            })}
            <tr style={{ background: "var(--line-soft)", fontWeight: 500 }}>
              <td className="serif-italic" style={{ fontSize: 18, fontStyle: "italic" }}>Razem</td>
              <td className="num mono">{total.toLocaleString("pl-PL")} zł</td>
              <td colSpan={editing ? 5 : 4} className="mono" style={{ textAlign: "right", paddingRight: 14 }}>
                zapłacono: <span style={{ color: "var(--sage)", fontWeight: 500 }}>{paid.toLocaleString("pl-PL")} zł</span>
                &nbsp;·&nbsp;
                pozostało: <span style={{ color: "var(--accent)", fontWeight: 500 }}>{pending.toLocaleString("pl-PL")} zł</span>
              </td>
            </tr>
          </tbody>
        </table>
        {editing && (
          <div className="add-row" style={{ padding: "12px 14px" }}>
            <button className="btn btn--small" onClick={add}><I3 name="plus" size={12} /> Dodaj płatność</button>
          </div>
        )}
      </div>
    </div>
  );
}

export { PageEvents, PageMusic, PageDocuments, PagePayments };

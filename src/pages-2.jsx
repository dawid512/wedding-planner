// Wedding Planner — page components (part 2)

import { Field as Field2, Check as Check2, Icon as Icon2, fmtCurrency as fmt$, fmtDate as fmtD, outfitTotals } from "./core";
import { PageHeader as PH } from "./pages-1";

// ============================================================
// TABLES
// ============================================================
function PageTables({ data, set, editing }) {
  // assigned guest ids across all tables
  const assignedIds = new Set();
  data.tables.forEach(t => t.guests.forEach(seat => {
    if (seat && typeof seat === "string") assignedIds.add(seat);
  }));

  // map id -> guest for quick lookup
  const guestById = {};
  data.guests.forEach(g => { guestById[g.id] = g; });

  // named guests (only those with a name go into dropdown)
  const namedGuests = data.guests.filter(g => g.name);
  const totalNamed = namedGuests.length;
  const assignedNamed = namedGuests.filter(g => assignedIds.has(g.id)).length;
  const pct = totalNamed ? Math.round((assignedNamed / totalNamed) * 100) : 0;

  const addTable = () => set(d => ({
    ...d,
    tables: [...d.tables, { id: "table" + Date.now(), name: "Stół " + (d.tables.length), capacity: 8, guests: Array(8).fill("") }],
  }));
  const removeTable = (id) => set(d => ({ ...d, tables: d.tables.filter(t => t.id !== id) }));
  const updateTable = (id, patch) => set(d => ({
    ...d,
    tables: d.tables.map(t => t.id === id ? { ...t, ...patch } : t),
  }));
  const updateSeat = (tid, idx, v) => set(d => ({
    ...d,
    tables: d.tables.map(t => {
      if (t.id !== tid) return t;
      const guests = [...t.guests];
      guests[idx] = v;
      return { ...t, guests };
    }),
  }));
  const addSeat = (tid) => set(d => ({
    ...d,
    tables: d.tables.map(t => t.id === tid ? { ...t, capacity: t.capacity + 1, guests: [...t.guests, ""] } : t),
  }));
  const removeSeat = (tid, idx) => set(d => ({
    ...d,
    tables: d.tables.map(t => {
      if (t.id !== tid) return t;
      const guests = t.guests.filter((_, i) => i !== idx);
      return { ...t, capacity: guests.length, guests };
    }),
  }));

  const totalSeats = data.tables.reduce((s, t) => s + t.capacity, 0);
  const occupied = data.tables.reduce((s, t) => s + t.guests.filter(g => g).length, 0);

  // For seat dropdown: available = named guests not yet assigned (anywhere)
  const availableForSeat = (currentId) => {
    const list = namedGuests.filter(g => !assignedIds.has(g.id) || g.id === currentId);
    return list;
  };

  const sideTag = (side) => {
    if (side === "Pan młody") return "tag--accent";
    if (side === "Obsługa") return "tag";
    return "";
  };

  return (
    <div className="page">
      <PH
        eyebrow="05 — Plan stołów"
        title="Rozsadzenie gości"
        sub="Wybierz osobę z listy dla każdego miejsca. Gość wybrany w jednym miejscu znika z pozostałych list. Krzyżyk obok miejsca zwalnia siedzenie."
        stats={[
          { num: pct + "%", label: "Przypisani" },
          { num: assignedNamed, label: "Na stołach" },
          { num: Math.max(0, totalNamed - assignedNamed), label: "Bez miejsca" },
          { num: data.tables.length, label: "Stołów" },
        ]}
      />

      <div className="card mb-24" style={{ marginBottom: 24 }}>
        <div className="row" style={{ gridTemplateColumns: "200px 1fr", borderBottom: "none", padding: "8px 0" }}>
          <div className="row__label">Postęp rozsadzania</div>
          <div>
            <div className="bar" style={{ marginTop: 10 }}>
              <div
                className={"bar__fill " + (pct === 100 ? "bar__fill--ok" : pct >= 80 ? "" : "bar__fill--warn")}
                style={{ width: pct + "%" }}
              />
            </div>
            <div className="mono mt-8 muted">
              {assignedNamed} z {totalNamed} gości przypisanych do stołów
              {totalNamed === 0 && " — najpierw dodaj gości w zakładce „Lista gości”"}
              {pct === 100 && totalNamed > 0 && " · wszyscy mają miejsce ✓"}
            </div>
          </div>
        </div>
      </div>

      <div className="tables-grid">
        {data.tables.map(t => {
          const filled = t.guests.filter(g => g).length;
          return (
            <div key={t.id} className="table-card">
              <div className="table-card__h">
                <div className="table-card__name">
                  <Field2 value={t.name} onChange={(v) => updateTable(t.id, { name: v })} placeholder="Nazwa stołu" editing={editing} inline />
                </div>
                <span className="table-card__cap">
                  {filled}/{t.capacity}
                </span>
              </div>
              <ol className="seats">
                {t.guests.map((seatId, i) => {
                  const g = seatId ? guestById[seatId] : null;
                  const options = availableForSeat(seatId);
                  return (
                    <li key={i}>
                      <span className="seat-num">{String(i + 1).padStart(2, "0")}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        {editing ? (
                          <select
                            className="field__input"
                            value={seatId || ""}
                            onChange={(e) => updateSeat(t.id, i, e.target.value)}
                            style={{ padding: "2px 6px", fontSize: 13, width: "100%" }}
                          >
                            <option value="">— wolne —</option>
                            {options.map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name}
                                {opt.child ? " (dziecko)" : ""}
                                {opt.side === "Pan młody" ? " · P.M." : ""}
                                {opt.side === "Obsługa" ? " · obsługa" : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          g ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ color: "var(--ink)" }}>{g.name}</span>
                              {g.child && <span className="tag" style={{ fontSize: 9, padding: "2px 6px" }}>dziecko</span>}
                              {g.side === "Obsługa" && <span className="tag" style={{ fontSize: 9, padding: "2px 6px" }}>obsługa</span>}
                            </span>
                          ) : (
                            // legacy string value support
                            (typeof seatId === "string" && seatId && !guestById[seatId])
                              ? <span>{seatId}</span>
                              : <span className="muted" style={{ fontStyle: "italic" }}>— wolne —</span>
                          )
                        )}
                      </span>
                      {editing && seatId && (
                        <button
                          className="btn btn--ghost btn--icon"
                          style={{ width: 22, height: 22, padding: 0, color: "var(--accent)" }}
                          onClick={() => updateSeat(t.id, i, "")}
                          title="Zwolnij miejsce"
                        >
                          <Icon2 name="x" size={12} />
                        </button>
                      )}
                      {editing && !seatId && (
                        <button
                          className="btn btn--ghost btn--icon"
                          style={{ width: 22, height: 22, padding: 0 }}
                          onClick={() => removeSeat(t.id, i)}
                          title="Usuń miejsce"
                        >
                          <Icon2 name="trash" size={11} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
              {editing && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn btn--small" onClick={() => addSeat(t.id)}>
                    <Icon2 name="plus" size={12} /> Miejsce
                  </button>
                  <button className="btn btn--small btn--ghost" onClick={() => removeTable(t.id)}>
                    <Icon2 name="trash" size={12} /> Usuń stół
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {editing && (
          <button className="table-card" onClick={addTable} style={{ border: "1px dashed var(--line)", justifyContent: "center", alignItems: "center", cursor: "pointer", background: "transparent" }}>
            <Icon2 name="plus" size={28} />
            <span className="mono muted mt-8">Nowy stół</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// VENDORS
// ============================================================
function PageVendors({ data, set, editing }) {
  const add = () => set(d => ({
    ...d,
    vendors: [...d.vendors, { id: "v" + Date.now(), name: "", category: "", contact: "", phone: "", price: "", status: "Szukam", notes: "" }],
  }));
  const remove = (id) => set(d => ({ ...d, vendors: d.vendors.filter(v => v.id !== id) }));
  const update = (id, patch) => set(d => ({
    ...d,
    vendors: d.vendors.map(v => v.id === id ? { ...v, ...patch } : v),
  }));

  const booked = data.vendors.filter(v => v.status === "Zarezerwowany").length;
  const negotiating = data.vendors.filter(v => v.status === "W rozmowie").length;

  const statusTag = (s) => {
    if (s === "Zarezerwowany") return "tag--ok";
    if (s === "W rozmowie") return "tag--warn";
    if (s === "Odrzucony") return "tag--no";
    return "";
  };

  return (
    <div className="page">
      <PH
        eyebrow="06 — Dostawcy"
        title="Z kim współpracujemy"
        sub="Sala, fotograf, DJ, catering — wszyscy w jednym miejscu z kontaktami, cenami i statusem rezerwacji."
        stats={[
          { num: data.vendors.length, label: "Razem" },
          { num: booked, label: "Zarezerwowani" },
          { num: negotiating, label: "W rozmowie" },
        ]}
      />

      <div className="grid grid--2">
        {data.vendors.map(v => (
          <div className="card" key={v.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, borderBottom: "1px solid var(--line-soft)", paddingBottom: 10 }}>
              <div>
                <div className="mono muted" style={{ marginBottom: 2 }}>
                  <Field2 value={v.category} onChange={(val) => update(v.id, { category: val })} placeholder="Kategoria" editing={editing} inline options={["Sala weselna", "Fotograf", "Film", "DJ", "Catering", "Kwiaciarnia", "Tort", "Cukiernia", "Zaproszenia", "Obrączki", "Stylista", "Inne"]} />
                </div>
                <div className="serif-italic" style={{ fontSize: 22 }}>
                  <Field2 value={v.name} onChange={(val) => update(v.id, { name: val })} placeholder="Nazwa firmy / osoby" editing={editing} inline />
                </div>
              </div>
              {editing ? (
                <Field2 value={v.status} onChange={(val) => update(v.id, { status: val })} editing={editing} inline options={["Szukam", "W rozmowie", "Zarezerwowany", "Odrzucony"]} />
              ) : (
                <span className={"tag " + statusTag(v.status)}>{v.status}</span>
              )}
            </div>
            <div className="row" style={{ gridTemplateColumns: "100px 1fr", padding: "8px 0" }}>
              <div className="row__label" style={{ padding: 0 }}>Kontakt</div>
              <Field2 value={v.contact} onChange={(val) => update(v.id, { contact: val })} placeholder="email lub strona" editing={editing} inline />
            </div>
            <div className="row" style={{ gridTemplateColumns: "100px 1fr", padding: "8px 0" }}>
              <div className="row__label" style={{ padding: 0 }}>Telefon</div>
              <Field2 value={v.phone} onChange={(val) => update(v.id, { phone: val })} placeholder="+48…" editing={editing} inline />
            </div>
            <div className="row" style={{ gridTemplateColumns: "100px 1fr", padding: "8px 0" }}>
              <div className="row__label" style={{ padding: 0 }}>Cena</div>
              <Field2 value={v.price} onChange={(val) => update(v.id, { price: val })} placeholder="—" editing={editing} inline suffix={v.price ? " zł" : ""} />
            </div>
            <div className="row" style={{ gridTemplateColumns: "100px 1fr", padding: "8px 0", borderBottom: "none" }}>
              <div className="row__label" style={{ padding: 0 }}>Notatki</div>
              <Field2 value={v.notes} onChange={(val) => update(v.id, { notes: val })} placeholder="Dodatkowe uwagi…" editing={editing} multiline />
            </div>
            {editing && (
              <div style={{ marginTop: 12, textAlign: "right" }}>
                <button className="btn btn--ghost btn--small" onClick={() => remove(v.id)}>
                  <Icon2 name="trash" size={12} /> Usuń
                </button>
              </div>
            )}
          </div>
        ))}
        {editing && (
          <button className="card" onClick={add} style={{ border: "1px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, cursor: "pointer", background: "transparent" }}>
            <div style={{ textAlign: "center" }}>
              <Icon2 name="plus" size={28} />
              <div className="mono muted mt-8">Nowy dostawca</div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SCHEDULE
// ============================================================
function PageSchedule({ data, set, editing }) {
  const add = () => set(d => ({
    ...d,
    schedule: [...d.schedule, { id: "s" + Date.now(), time: "", title: "", note: "" }],
  }));
  const remove = (id) => set(d => ({ ...d, schedule: d.schedule.filter(s => s.id !== id) }));
  const update = (id, patch) => set(d => ({
    ...d,
    schedule: d.schedule.map(s => s.id === id ? { ...s, ...patch } : s),
  }));

  return (
    <div className="page">
      <PH
        eyebrow="07 — Harmonogram"
        title="Plan dnia ślubu"
        sub="Od przygotowań po pierwszy taniec i poprawiny. Godziny, miejsca i notatki dla każdego punktu."
      />

      <div className="card">
        <div className="timeline">
          {data.schedule.map(s => (
            <div key={s.id} className="tl-row">
              <div className="tl-time">
                <Field2 value={s.time} onChange={(v) => update(s.id, { time: v })} placeholder="--:--" editing={editing} inline />
              </div>
              <div>
                <div className="tl-title">
                  <Field2 value={s.title} onChange={(v) => update(s.id, { title: v })} placeholder="Nazwa punktu" editing={editing} inline />
                </div>
                <div className="tl-note">
                  <Field2 value={s.note} onChange={(v) => update(s.id, { note: v })} placeholder="Miejsce, osoby, uwagi…" editing={editing} multiline={editing} />
                </div>
              </div>
              {editing && (
                <button className="btn btn--ghost btn--icon" onClick={() => remove(s.id)}>
                  <Icon2 name="trash" />
                </button>
              )}
            </div>
          ))}
        </div>
        {editing && (
          <div className="add-row">
            <button className="btn btn--small" onClick={add}>
              <Icon2 name="plus" size={12} /> Dodaj punkt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MENU
// ============================================================
function PageMenu({ data, set, editing }) {
  const update = (key, value) => set(d => ({ ...d, menu: { ...d.menu, [key]: value } }));
  const m = data.menu;

  const items = [
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
      <PH
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
                <Field2 value={m[key]} onChange={(v) => update(key, v)} placeholder="np. krem z borowików z grzanką" editing={editing} multiline={editing} />
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
                <Field2 value={m.notes} onChange={(v) => update("notes", v)} placeholder="Smak, kształt, kolory, liczba pięter, dekoracja…" editing={editing} multiline />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// OUTFITS
// ============================================================
function OutfitsTable({ items, listKey, updateItem, addItem, removeItem, editing, fallback }) {
  const totals = outfitTotals(items);
  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="tbl outfit-tbl">
        <thead>
          <tr>
            <th style={{ width: "26%" }}>Pozycja</th>
            <th>Skąd / marka</th>
            <th>Gdzie</th>
            <th className="num" style={{ width: 100 }}>Cena</th>
            <th style={{ width: 80, textAlign: "center" }}>Kupione</th>
            <th style={{ width: 80, textAlign: "center" }}>Opłacone</th>
            {editing && <th style={{ width: 36 }}></th>}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={editing ? 7 : 6} className="muted serif-italic" style={{ textAlign: "center", padding: "20px 14px", fontStyle: "italic" }}>
                Brak pozycji. {editing ? "Kliknij „Dodaj”" : "Włącz edycję, by dodać"}.
              </td>
            </tr>
          )}
          {items.map(it => (
            <tr key={it.id} className={it.bought ? "" : ""}>
              <td>
                <Field2 value={it.name} onChange={(v) => updateItem(listKey, it.id, { name: v })} placeholder="np. Suknia" editing={editing} inline />
              </td>
              <td>
                <Field2 value={it.where} onChange={(v) => updateItem(listKey, it.id, { where: v })} placeholder="salon / marka" editing={editing} inline />
              </td>
              <td>
                <Field2 value={it.location} onChange={(v) => updateItem(listKey, it.id, { location: v })} placeholder="adres / odbiór" editing={editing} inline />
              </td>
              <td className="num">
                <Field2 value={it.price} onChange={(v) => updateItem(listKey, it.id, { price: v })} placeholder="—" editing={editing} inline type="number" suffix=" zł" />
              </td>
              <td style={{ textAlign: "center" }}>
                <Check2 on={it.bought} onClick={() => updateItem(listKey, it.id, { bought: !it.bought, paid: !it.bought ? it.paid : false })} />
              </td>
              <td style={{ textAlign: "center" }}>
                <Check2
                  on={it.paid}
                  onClick={() => updateItem(listKey, it.id, { paid: !it.paid, bought: !it.paid ? true : it.bought })}
                />
              </td>
              {editing && (
                <td>
                  <button className="btn btn--ghost btn--icon" onClick={() => removeItem(listKey, it.id)}>
                    <Icon2 name="trash" />
                  </button>
                </td>
              )}
            </tr>
          ))}
          <tr style={{ background: "var(--line-soft)" }}>
            <td className="serif-italic" style={{ fontSize: 16, fontStyle: "italic" }} colSpan={3}>
              Razem &nbsp;<span className="mono muted" style={{ fontSize: 11 }}>{totals.bought}/{totals.total} kupione</span>
            </td>
            <td className="num mono" style={{ fontWeight: 500 }}>
              {totals.planned ? totals.planned.toLocaleString("pl-PL") + " zł" : "—"}
            </td>
            <td colSpan={editing ? 3 : 2} className="mono" style={{ textAlign: "right", paddingRight: 14 }}>
              opłacone:&nbsp;
              <span style={{ color: "var(--sage)", fontWeight: 500 }}>
                {totals.paid ? totals.paid.toLocaleString("pl-PL") + " zł" : "—"}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      {editing && (
        <div className="add-row" style={{ padding: "12px 14px" }}>
          <button className="btn btn--small" onClick={() => addItem(listKey)}>
            <Icon2 name="plus" size={12} /> Dodaj pozycję
          </button>
        </div>
      )}
    </div>
  );
}

function PageOutfits({ data, set, editing }) {
  const o = data.outfits || {};
  const brideItems = o.brideItems || [];
  const groomItems = o.groomItems || [];

  const updateItem = (listKey, id, patch) => set(d => ({
    ...d,
    outfits: {
      ...d.outfits,
      [listKey]: (d.outfits?.[listKey] || []).map(x => x.id === id ? { ...x, ...patch } : x),
    },
  }));
  const addItem = (listKey) => set(d => ({
    ...d,
    outfits: {
      ...d.outfits,
      [listKey]: [...(d.outfits?.[listKey] || []), {
        id: listKey.slice(0, 2) + Date.now(),
        name: "", where: "", location: "", price: "", bought: false, paid: false,
      }],
    },
  }));
  const removeItem = (listKey, id) => set(d => ({
    ...d,
    outfits: {
      ...d.outfits,
      [listKey]: (d.outfits?.[listKey] || []).filter(x => x.id !== id),
    },
  }));

  const updateNotes = (v) => set(d => ({ ...d, outfits: { ...d.outfits, notes: v } }));

  const brideT = outfitTotals(brideItems);
  const groomT = outfitTotals(groomItems);
  const totalPlanned = brideT.planned + groomT.planned;
  const totalPaid = brideT.paid + groomT.paid;
  const totalBought = brideT.bought + groomT.bought;
  const totalItems = brideT.total + groomT.total;

  return (
    <div className="page">
      <PH
        eyebrow="09 — Stroje"
        title="Co, skąd, za ile"
        sub="Każda pozycja: gdzie kupujesz, gdzie się znajduje (przymiarka, odbiór), cena, status kupna i opłaty. Sumy idą automatycznie do budżetu."
        stats={[
          { num: totalPlanned ? totalPlanned.toLocaleString("pl-PL") + " zł" : "—", label: "Razem planowane" },
          { num: totalPaid ? totalPaid.toLocaleString("pl-PL") + " zł" : "—", label: "Już opłacone" },
          { num: totalBought + " / " + totalItems, label: "Kupione" },
        ]}
      />

      <div className="section">
        <div className="section__h">
          <h2 className="section__title">Panna młoda</h2>
          <span className="section__hint">{brideT.bought}/{brideT.total} kupione · {brideT.paid.toLocaleString("pl-PL")} zł opłacone</span>
        </div>
        <OutfitsTable
          items={brideItems}
          listKey="brideItems"
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
          editing={editing}
        />
      </div>

      <div className="section">
        <div className="section__h">
          <h2 className="section__title">Pan młody</h2>
          <span className="section__hint">{groomT.bought}/{groomT.total} kupione · {groomT.paid.toLocaleString("pl-PL")} zł opłacone</span>
        </div>
        <OutfitsTable
          items={groomItems}
          listKey="groomItems"
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
          editing={editing}
        />
      </div>

      <div className="card mt-24">
        <div className="row" style={{ gridTemplateColumns: "180px 1fr", borderBottom: "none", padding: "8px 0" }}>
          <div className="row__label">Notatki</div>
          <Field2 value={o.notes} onChange={updateNotes} placeholder="Terminy przymiarek, kontakty, uwagi…" editing={editing} multiline />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INSPIRATION
// ============================================================
function PageInspiration({ data, set, editing }) {
  const add = () => set(d => ({
    ...d,
    inspiration: [...d.inspiration, { id: "i" + Date.now(), label: "", note: "" }],
  }));
  const remove = (id) => set(d => ({ ...d, inspiration: d.inspiration.filter(i => i.id !== id) }));
  const update = (id, patch) => set(d => ({
    ...d,
    inspiration: d.inspiration.map(i => i.id === id ? { ...i, ...patch } : i),
  }));

  return (
    <div className="page">
      <PH
        eyebrow="10 — Moodboard"
        title="Inspiracje"
        sub="Wszystko, co ma być na ślubie: kwiaty, dekoracje, kolory, faktury. Dorzucaj zdjęcia i opisy."
        stats={[{ num: data.inspiration.length, label: "Pomysłów" }]}
      />

      <div className="mood">
        {data.inspiration.map(i => (
          <div className="mood-card" key={i.id}>
            <div className="mood-img">[ zrzut / zdjęcie ]</div>
            <div className="mood-meta">
              <div className="mood-meta__label">Kategoria</div>
              <div className="serif-italic" style={{ fontSize: 18, marginBottom: 6 }}>
                <Field2 value={i.label} onChange={(v) => update(i.id, { label: v })} placeholder="np. Bukiet" editing={editing} inline />
              </div>
              <Field2 value={i.note} onChange={(v) => update(i.id, { note: v })} placeholder="Opis, link, kolor, faktura…" editing={editing} multiline={editing} />
              {editing && (
                <button className="btn btn--ghost btn--small mt-8" onClick={() => remove(i.id)}>
                  <Icon2 name="trash" size={12} /> Usuń
                </button>
              )}
            </div>
          </div>
        ))}
        {editing && (
          <button className="mood-card" onClick={add} style={{ border: "1px dashed var(--line)", cursor: "pointer", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280 }}>
            <Icon2 name="plus" size={28} />
            <div className="mono muted mt-8">Nowa inspiracja</div>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// GIFTS
// ============================================================
function PageGifts({ data, set, editing }) {
  const add = () => set(d => ({
    ...d,
    gifts: [...d.gifts, { id: "gi" + Date.now(), item: "", from: "", status: "Życzenie" }],
  }));
  const remove = (id) => set(d => ({ ...d, gifts: d.gifts.filter(g => g.id !== id) }));
  const update = (id, patch) => set(d => ({
    ...d,
    gifts: d.gifts.map(g => g.id === id ? { ...g, ...patch } : g),
  }));

  const statusTag = (s) => {
    if (s === "Otrzymany") return "tag--ok";
    if (s === "Zarezerwowany") return "tag--accent";
    return "tag--warn";
  };

  const total = data.gifts.length;
  const got = data.gifts.filter(g => g.status === "Otrzymany").length;

  return (
    <div className="page">
      <PH
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
                  <Field2 value={g.item} onChange={(v) => update(g.id, { item: v })} placeholder="np. zestaw porcelany" editing={editing} inline />
                </td>
                <td>
                  <Field2 value={g.from} onChange={(v) => update(g.id, { from: v })} placeholder="imię/imiona" editing={editing} inline />
                </td>
                <td>
                  <Field2 value={g.status} onChange={(v) => update(g.id, { status: v })} editing={editing} inline options={["Życzenie", "Zarezerwowany", "Otrzymany"]} />
                  {!editing && <span className={"tag " + statusTag(g.status)}>{g.status}</span>}
                </td>
                {editing && (
                  <td>
                    <button className="btn btn--ghost btn--icon" onClick={() => remove(g.id)}>
                      <Icon2 name="trash" />
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
              <Icon2 name="plus" size={12} /> Dodaj pozycję
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// HONEYMOON
// ============================================================
function PageHoneymoon({ data, set, editing }) {
  const update = (key, value) => set(d => ({ ...d, honeymoon: { ...d.honeymoon, [key]: value } }));
  const h = data.honeymoon;

  return (
    <div className="page">
      <PH
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
              <Field2 value={h.destination} onChange={(v) => update("destination", v)} placeholder="np. Santorini, Grecja" editing={editing} inline />
            </div>
          </div>
          <div className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="row__label">Daty</div>
            <Field2 value={h.dates} onChange={(v) => update("dates", v)} placeholder="np. 20-30 września" editing={editing} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="row__label">Loty</div>
            <Field2 value={h.flights} onChange={(v) => update("flights", v)} placeholder="numer lotu, linia, terminy" editing={editing} multiline={editing} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="row__label">Hotel</div>
            <Field2 value={h.hotel} onChange={(v) => update("hotel", v)} placeholder="nazwa hotelu, adres" editing={editing} multiline={editing} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="row__label">Budżet</div>
            <Field2 value={h.budget} onChange={(v) => update("budget", v)} placeholder="—" editing={editing} suffix={h.budget ? " zł" : ""} />
          </div>
          <div className="row" style={{ gridTemplateColumns: "140px 1fr", borderBottom: "none" }}>
            <div className="row__label">Plan dnia / atrakcje</div>
            <Field2 value={h.activities} onChange={(v) => update("activities", v)} placeholder="Co chcemy zobaczyć / zrobić" editing={editing} multiline />
          </div>
        </div>
      </div>

      <div className="card mt-24">
        <div className="section__h">
          <h2 className="section__title">Notatki</h2>
        </div>
        <Field2 value={h.notes} onChange={(v) => update("notes", v)} placeholder="Dokumenty, ubezpieczenie, pakowanie, transfery…" editing={editing} multiline />
      </div>
    </div>
  );
}

export {
  PageTables, PageVendors, PageSchedule, PageMenu,
  PageOutfits, PageInspiration, PageGifts, PageHoneymoon,
  outfitTotals,
};

// Lista gości — z typami, ceną talerzyka, poprawinami, kalkulatorem sali i grupowaniem
import React from "react";
import { Field, Check, Icon } from "../core";
import type { AppData, PageProps, GuestType } from "../core";
import { PageHeader } from "./_shared";

const GUEST_SIDES = ["Panna młoda", "Pan młody", "Obsługa"] as const;
type GuestSide = typeof GUEST_SIDES[number];

// Etykiety procentowe — identyczne dla gości i obsługi
const GUEST_TYPE_LABELS: Record<GuestType, string> = {
  adult:      "100%",
  child_half: "50%",
  child_free: "0%",
};

// Paleta kolorów grup — każda grupa ma inny kolor (bg + border)
const GROUP_COLORS: Array<{ bg: string; border: string; badge: string }> = [
  { bg: "rgba(239,68,68,0.07)",   border: "rgb(239,68,68)",   badge: "rgb(220,38,38)" },   // czerwony
  { bg: "rgba(59,130,246,0.07)",  border: "rgb(59,130,246)",  badge: "rgb(37,99,235)" },   // niebieski
  { bg: "rgba(34,197,94,0.07)",   border: "rgb(34,197,94)",   badge: "rgb(22,163,74)" },   // zielony
  { bg: "rgba(245,158,11,0.07)",  border: "rgb(245,158,11)",  badge: "rgb(217,119,6)" },   // bursztyn
  { bg: "rgba(168,85,247,0.07)",  border: "rgb(168,85,247)",  badge: "rgb(147,51,234)" },  // fiolet
  { bg: "rgba(20,184,166,0.07)",  border: "rgb(20,184,166)",  badge: "rgb(13,148,136)" },  // turkus
  { bg: "rgba(249,115,22,0.07)",  border: "rgb(249,115,22)",  badge: "rgb(234,88,12)" },   // pomarańcz
  { bg: "rgba(236,72,153,0.07)",  border: "rgb(236,72,153)",  badge: "rgb(219,39,119)" },  // róż
];

/** Buduje mapę groupId → indeks koloru (w kolejności pierwszego wystąpienia) */
function buildGroupColorMap(guests: AppData["guests"]): Record<string, number> {
  const map: Record<string, number> = {};
  let idx = 0;
  for (const g of guests) {
    if (g.groupId && !(g.groupId in map)) {
      map[g.groupId] = idx++;
    }
  }
  return map;
}

/** Sortuje gości tak, żeby członkowie tej samej grupy siedzieli obok siebie */
function buildOrderedGuests(guests: AppData["guests"]): AppData["guests"] {
  const visited = new Set<string>();
  const result: AppData["guests"][number][] = [];
  for (const g of guests) {
    if (visited.has(g.id)) continue;
    result.push(g);
    visited.add(g.id);
    if (g.groupId) {
      for (const other of guests) {
        if (!visited.has(other.id) && other.groupId === g.groupId) {
          result.push(other);
          visited.add(other.id);
        }
      }
    }
  }
  return result;
}

function guestPrice(pp: number, gt: GuestType | undefined): number {
  const t = gt ?? "adult";
  if (t === "child_free") return 0;
  if (t === "child_half") return pp * 0.5;
  return pp;
}

function NumInput({ value, onChange, placeholder, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties;
}) {
  return (
    <input
      type="text" inputMode="numeric" pattern="[0-9]*"
      value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
      style={{ font: "inherit", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 8px", background: "var(--surface)", color: "inherit", width: "10ch", ...style }}
    />
  );
}

export function PageGuests({ data, set, editing }: PageProps) {
  const [pairingFor, setPairingFor] = React.useState<string | null>(null);

  const vs  = data.venueSettings ?? { platePrice: "", afterPartyPlatePrice: "", deposit: "" };
  const pp  = parseFloat(vs.platePrice) || 0;
  const app = parseFloat(vs.afterPartyPlatePrice) || 0;
  const dep = parseFloat(vs.deposit) || 0;

  const guestById: Record<string, AppData["guests"][number]> = {};
  data.guests.forEach(g => { guestById[g.id] = g; });

  // Mapa groupId → indeks koloru (obliczana raz, na podstawie wszystkich gości)
  const groupColorMap = buildGroupColorMap(data.guests);

  const addGuest = (side: GuestSide) => set((d: AppData) => ({
    ...d,
    guests: [...d.guests, { id: "g" + Date.now(), name: "", side, rsvp: "Czeka", diet: "", guestType: "adult" as GuestType, phone: "", address: "", needsAccommodation: false, poprawiny: false }],
  }));

  const removeGuest = (id: string) => set((d: AppData) => {
    const gid = d.guests.find(x => x.id === id)?.groupId;
    const remainingInGroup = gid ? d.guests.filter(x => x.id !== id && x.groupId === gid) : [];
    return {
      ...d,
      guests: d.guests
        .filter(x => x.id !== id)
        .map(x => {
          // Jeśli po usunięciu w grupie zostaje tylko 1 osoba — rozwiąż grupę
          if (x.groupId === gid && remainingInGroup.length === 1) {
            return { ...x, groupId: undefined };
          }
          return x;
        }),
    };
  });

  const updateGuest = (id: string, patch: Partial<AppData["guests"][number]>) => set((d: AppData) => ({
    ...d,
    guests: d.guests.map(g => g.id === id ? { ...g, ...patch } : g),
  }));

  const setVenue = (patch: Partial<typeof vs>) => set((d: AppData) => ({
    ...d,
    venueSettings: { ...(d.venueSettings ?? { platePrice: "", afterPartyPlatePrice: "", deposit: "" }), ...patch },
  }));

  /**
   * Paruje/dołącza do grupy: jeśli idFrom ma już groupId → idTo dołącza do tej grupy;
   * jeśli idTo ma groupId → idFrom dołącza do tej grupy;
   * jeśli żaden nie ma → tworzymy nową grupę.
   */
  const pairWith = (idFrom: string, idTo: string) => {
    set((d: AppData) => {
      const gFrom = d.guests.find(x => x.id === idFrom);
      const gTo   = d.guests.find(x => x.id === idTo);
      const newGroupId = gFrom?.groupId ?? gTo?.groupId ?? ("grp" + Date.now());
      return {
        ...d,
        guests: d.guests.map(g =>
          g.id === idFrom || g.id === idTo ? { ...g, groupId: newGroupId } : g
        ),
      };
    });
    setPairingFor(null);
  };

  /**
   * Usuwa gościa z grupy. Jeśli zostaje tylko 1 osoba — rozwiązuje całą grupę.
   */
  const leaveGroup = (id: string) => {
    set((d: AppData) => {
      const gid = d.guests.find(x => x.id === id)?.groupId;
      if (!gid) return d;
      const remaining = d.guests.filter(x => x.id !== id && x.groupId === gid);
      return {
        ...d,
        guests: d.guests.map(x => {
          if (x.id === id) return { ...x, groupId: undefined };
          if (remaining.length === 1 && x.groupId === gid) return { ...x, groupId: undefined };
          return x;
        }),
      };
    });
  };

  const named          = data.guests.filter(g => g.name);
  const active         = named.filter(g => g.rsvp !== "Odmowa");
  const confirmed      = named.filter(g => g.rsvp === "Potwierdzony").length;
  const declined       = named.filter(g => g.rsvp === "Odmowa").length;
  const waiting        = named.filter(g => g.rsvp === "Czeka").length;
  const childCount     = named.filter(g => g.guestType === "child_half" || g.guestType === "child_free").length;
  const accom          = named.filter(g => g.needsAccommodation).length;
  const afterPartyCount = named.filter(g => g.poprawiny).length;

  // Liczba unikalnych grup z ≥2 osobami
  const groupIds = [...new Set(named.filter(g => g.groupId).map(g => g.groupId!))];
  const activeGroupCount = groupIds.filter(gid => named.filter(g => g.groupId === gid).length >= 2).length;

  const adultsCount    = active.filter(g => !g.guestType || g.guestType === "adult").length;
  const halfCount      = active.filter(g => g.guestType === "child_half").length;
  const freeCount      = active.filter(g => g.guestType === "child_free").length;
  const totalCost      = pp > 0 ? (adultsCount * pp) + (halfCount * pp * 0.5) : 0;
  const afterPartyCost = app > 0 ? afterPartyCount * app : 0;

  const rsvpTag = (s: string): string => {
    if (s === "Potwierdzony") return "tag--ok";
    if (s === "Odmowa")       return "tag--no";
    return "tag--warn";
  };

  const bySide: Record<GuestSide, typeof data.guests> = { "Panna młoda": [], "Pan młody": [], "Obsługa": [] };
  data.guests.forEach(g => {
    const side = (GUEST_SIDES as readonly string[]).includes(g.side) ? g.side as GuestSide : "Panna młoda";
    bySide[side].push(g);
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow="04 — Goście"
        title="Lista zaproszonych"
        sub="Podzielona na stronę pani młodej, pana młodego i obsługę. Typ gościa i poprawiny dla każdej osoby."
        stats={[
          { num: named.length,       label: "Łącznie" },
          { num: confirmed,          label: "Potwierdzeni" },
          { num: waiting,            label: "Oczekuje" },
          { num: declined,           label: "Odmowa" },
          { num: childCount,         label: "Dzieci" },
          { num: afterPartyCount,    label: "Poprawiny" },
          { num: accom,              label: "Nocleg" },
          { num: activeGroupCount,   label: "Grup" },
        ]}
      />

      {/* Venue settings + cost calculator */}
      <div className="card mb-24">
        <div className="venue-grid">
          <div>
            <div className="row__label" style={{ marginBottom: 6 }}>Cena talerzyk (sala)</div>
            {editing ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <NumInput value={vs.platePrice} onChange={(v) => setVenue({ platePrice: v })} placeholder="np. 200" />
                <span className="muted">zł / os.</span>
              </div>
            ) : (
              <span className="serif-italic" style={{ fontSize: 20 }}>
                {vs.platePrice ? Number(vs.platePrice).toLocaleString("pl-PL") + " zł" : "—"}
              </span>
            )}
          </div>
          <div>
            <div className="row__label" style={{ marginBottom: 6 }}>Cena talerzyk (poprawiny)</div>
            {editing ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <NumInput value={vs.afterPartyPlatePrice} onChange={(v) => setVenue({ afterPartyPlatePrice: v })} placeholder="np. 150" />
                <span className="muted">zł / os.</span>
              </div>
            ) : (
              <span className="serif-italic" style={{ fontSize: 20 }}>
                {vs.afterPartyPlatePrice ? Number(vs.afterPartyPlatePrice).toLocaleString("pl-PL") + " zł" : "—"}
              </span>
            )}
          </div>
          <div>
            <div className="row__label" style={{ marginBottom: 6 }}>Zaliczka</div>
            {editing ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <NumInput value={vs.deposit} onChange={(v) => setVenue({ deposit: v })} placeholder="np. 5000" />
                <span className="muted">zł</span>
              </div>
            ) : (
              <span className="serif-italic" style={{ fontSize: 20 }}>
                {vs.deposit ? Number(vs.deposit).toLocaleString("pl-PL") + " zł" : "—"}
              </span>
            )}
          </div>
        </div>

        {pp > 0 && active.length > 0 && (
          <div className="venue-2col" style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
            <div>
              <div className="row__label" style={{ marginBottom: 8 }}>Kalkulator kosztów sali</div>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <tbody>
                  {adultsCount > 0 && (
                    <tr>
                      <td className="muted">100%: {adultsCount} × {pp.toLocaleString("pl-PL")} zł</td>
                      <td className="mono" style={{ textAlign: "right" }}>{(adultsCount * pp).toLocaleString("pl-PL")} zł</td>
                    </tr>
                  )}
                  {halfCount > 0 && (
                    <tr>
                      <td className="muted">50%: {halfCount} × {(pp * 0.5).toLocaleString("pl-PL")} zł</td>
                      <td className="mono" style={{ textAlign: "right" }}>{(halfCount * pp * 0.5).toLocaleString("pl-PL")} zł</td>
                    </tr>
                  )}
                  {freeCount > 0 && (
                    <tr>
                      <td className="muted">0% (bezpłatni): {freeCount}</td>
                      <td className="mono" style={{ textAlign: "right" }}>0 zł</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: "1px solid var(--line-soft)", fontWeight: 600 }}>
                    <td style={{ paddingTop: 6 }}>Razem ({active.length} os.)</td>
                    <td className="mono" style={{ textAlign: "right", paddingTop: 6 }}>{totalCost.toLocaleString("pl-PL")} zł</td>
                  </tr>
                  {dep > 0 && (
                    <tr style={{ color: "var(--sage)" }}>
                      <td>Zaliczka</td>
                      <td className="mono" style={{ textAlign: "right" }}>−{dep.toLocaleString("pl-PL")} zł</td>
                    </tr>
                  )}
                  {dep > 0 && (
                    <tr style={{ fontWeight: 600 }}>
                      <td>Do zapłaty</td>
                      <td className="mono" style={{ textAlign: "right" }}>{Math.max(0, totalCost - dep).toLocaleString("pl-PL")} zł</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {app > 0 && afterPartyCount > 0 && (
              <div>
                <div className="row__label" style={{ marginBottom: 8 }}>Poprawiny</div>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td className="muted">{afterPartyCount} os. × {app.toLocaleString("pl-PL")} zł</td>
                      <td className="mono" style={{ textAlign: "right" }}>{afterPartyCost.toLocaleString("pl-PL")} zł</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {GUEST_SIDES.map(side => {
        const groupGuests   = bySide[side];
        const orderedGuests = buildOrderedGuests(groupGuests);
        const groupNamed    = groupGuests.filter(g => g.name).length;
        const isStaff       = side === "Obsługa";

        // Goście dostępni do sparowania: bez grupy, ta sama strona, mają imię
        const availableForPairing = (id: string) =>
          data.guests.filter(g => g.name && g.id !== id && !g.groupId && g.side === side);

        return (
          <div className="section" key={side}>
            <div className="section__h">
              <h2 className="section__title">
                {side === "Panna młoda" && "Goście panny młodej"}
                {side === "Pan młody"   && "Goście pana młodego"}
                {side === "Obsługa"     && "Obsługa weselna"}
              </h2>
              <span className="section__hint">{groupNamed} {groupNamed === 1 ? "osoba" : "osób"}</span>
            </div>
            <div className="card" style={{ padding: 0 }}>
              <table className="tbl tbl--wide">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Imię i nazwisko</th>
                    <th>Kontakt</th>
                    <th>RSVP</th>
                    <th>Preferencje</th>
                    <th style={{ minWidth: 80 }}>Cena</th>
                    <th style={{ width: 80, textAlign: "center" }}>Poprawiny</th>
                    <th style={{ width: 80, textAlign: "center" }}>Nocleg</th>
                    {editing && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {orderedGuests.length === 0 && (
                    <tr>
                      <td colSpan={editing ? 9 : 8} className="muted serif-italic" style={{ textAlign: "center", padding: "24px 14px", fontStyle: "italic" }}>
                        Brak osób w tej grupie. {editing ? 'Kliknij „Dodaj" poniżej.' : "Włącz tryb edycji, by dodać."}
                      </td>
                    </tr>
                  )}
                  {orderedGuests.map((g, i) => {
                    const gt        = (g.guestType as GuestType) ?? "adult";
                    const unitPrice = guestPrice(pp, gt);

                    // Kolor grupy
                    const colorIdx   = g.groupId != null ? (groupColorMap[g.groupId] ?? 0) % GROUP_COLORS.length : null;
                    const groupColor = colorIdx != null ? GROUP_COLORS[colorIdx] : null;

                    // Inni członkowie tej grupy
                    const groupMembers = g.groupId
                      ? data.guests.filter(x => x.id !== g.id && x.groupId === g.groupId && x.name)
                      : [];

                    const rowStyle: React.CSSProperties = groupColor
                      ? { background: groupColor.bg, borderLeft: `3px solid ${groupColor.border}` }
                      : {};

                    return (
                      <tr key={g.id} style={rowStyle}>
                        <td className="mono muted">{String(i + 1).padStart(2, "0")}</td>
                        <td>
                          <Field value={g.name} onChange={(v) => updateGuest(g.id, { name: v })} placeholder="np. Anna Kowalska" editing={editing} inline />

                          {/* Członkowie grupy — widok */}
                          {!editing && groupMembers.length > 0 && (
                            <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                              {groupMembers.map(m => (
                                <span key={m.id} className="mono" style={{ fontSize: 10, color: groupColor?.badge ?? "var(--accent)", display: "flex", alignItems: "center", gap: 3 }}>
                                  <span>↔</span>
                                  <span>{m.name}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {editing && (
                            <div style={{ marginTop: 6 }}>
                              <Field value={g.address} onChange={(v) => updateGuest(g.id, { address: v })} placeholder="adres (opcjonalnie)" editing={editing} inline />
                            </div>
                          )}
                          {!editing && g.address && <div className="muted mono" style={{ fontSize: 10, marginTop: 2 }}>{g.address}</div>}

                          {/* Parowanie — tryb edycji */}
                          {editing && (
                            <div style={{ marginTop: 6 }}>
                              {g.groupId ? (
                                /* W grupie — pokaż członków + opcje */
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  {groupMembers.map(m => (
                                    <span key={m.id} style={{ fontSize: 11, color: groupColor?.badge ?? "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}>
                                      <span>↔</span>
                                      <span className="muted">{m.name || "(brak nazwy)"}</span>
                                    </span>
                                  ))}
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                    <button
                                      className="btn btn--ghost btn--small"
                                      onClick={() => leaveGroup(g.id)}
                                      style={{ fontSize: 10, padding: "1px 6px", color: "var(--ink-faint)" }}
                                    >
                                      Wyjdź z grupy
                                    </button>
                                    {/* Dodaj kolejną osobę do tej grupy */}
                                    {pairingFor === g.id ? (
                                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <select
                                          className="field__input"
                                          style={{ fontSize: 11, padding: "2px 4px" }}
                                          defaultValue=""
                                          onChange={(e) => e.target.value && pairWith(g.id, e.target.value)}
                                        >
                                          <option value="" disabled>Dodaj osobę…</option>
                                          {availableForPairing(g.id).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                          ))}
                                        </select>
                                        <button
                                          className="btn btn--ghost btn--small"
                                          onClick={() => setPairingFor(null)}
                                          style={{ fontSize: 10, padding: "1px 6px" }}
                                        >×</button>
                                      </div>
                                    ) : availableForPairing(g.id).length > 0 ? (
                                      <button
                                        className="btn btn--ghost btn--small"
                                        onClick={() => setPairingFor(g.id)}
                                        style={{ fontSize: 10, padding: "1px 6px", color: groupColor?.badge ?? "var(--accent)" }}
                                      >+ Dodaj do grupy</button>
                                    ) : null}
                                  </div>
                                </div>
                              ) : pairingFor === g.id ? (
                                /* Wybieramy z kim się sparować */
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <select
                                    className="field__input"
                                    style={{ fontSize: 11, padding: "2px 4px" }}
                                    defaultValue=""
                                    onChange={(e) => e.target.value && pairWith(g.id, e.target.value)}
                                  >
                                    <option value="" disabled>Wybierz partnera…</option>
                                    {availableForPairing(g.id).map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    className="btn btn--ghost btn--small"
                                    onClick={() => setPairingFor(null)}
                                    style={{ fontSize: 10, padding: "1px 6px" }}
                                  >×</button>
                                </div>
                              ) : availableForPairing(g.id).length > 0 ? (
                                <button
                                  className="btn btn--ghost btn--small"
                                  onClick={() => setPairingFor(g.id)}
                                  style={{ fontSize: 10, padding: "1px 6px", color: "var(--ink-faint)" }}
                                  title="Sparuj z innym gościem tej samej strony"
                                >↔ Sparuj</button>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td>
                          <Field value={g.phone} onChange={(v) => updateGuest(g.id, { phone: v })} placeholder="+48…" editing={editing} inline />
                        </td>
                        <td>
                          {editing
                            ? <Field value={g.rsvp} onChange={(v) => updateGuest(g.id, { rsvp: v })} editing={editing} inline options={["Czeka", "Potwierdzony", "Odmowa"]} />
                            : <span className={"tag " + rsvpTag(g.rsvp)}>{g.rsvp}</span>
                          }
                        </td>
                        <td>
                          <Field value={g.diet} onChange={(v) => updateGuest(g.id, { diet: v })} placeholder="np. wegetariańskie" editing={editing} inline />
                        </td>
                        <td>
                          {editing ? (
                            <select
                              className="field field--inline is-editing field__input"
                              value={gt}
                              onChange={(e) => updateGuest(g.id, { guestType: e.target.value as GuestType })}
                              style={{ width: "100%" }}
                            >
                              {(Object.entries(GUEST_TYPE_LABELS) as [GuestType, string][]).map(([val, lbl]) => (
                                <option key={val} value={val}>{lbl}</option>
                              ))}
                            </select>
                          ) : (
                            <div>
                              {gt !== "adult" && (
                                <span className="mono muted" style={{ fontSize: 12 }}>{GUEST_TYPE_LABELS[gt]}</span>
                              )}
                              {pp > 0 && g.rsvp !== "Odmowa" && (
                                <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>{unitPrice.toLocaleString("pl-PL")} zł</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Check on={g.poprawiny ?? false} onClick={() => updateGuest(g.id, { poprawiny: !(g.poprawiny ?? false) })} />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Check on={g.needsAccommodation} onClick={() => updateGuest(g.id, { needsAccommodation: !g.needsAccommodation })} />
                        </td>
                        {editing && (
                          <td>
                            <button className="btn btn--ghost btn--icon" onClick={() => removeGuest(g.id)}>
                              <Icon name="trash" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {editing && (
                <div className="add-row" style={{ padding: "12px 14px" }}>
                  <button className="btn btn--small" onClick={() => addGuest(side)}>
                    <Icon name="plus" size={12} /> Dodaj {isStaff ? "osobę obsługi" : "gościa"}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

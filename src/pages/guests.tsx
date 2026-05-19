// Lista gości — z typami, ceną talerzyka, poprawinami, kalkulatorem sali i parowaniem
import React from "react";
import { Field, Check, Icon } from "../core";
import type { AppData, PageProps, GuestType } from "../core";
import { PageHeader } from "./_shared";

const GUEST_SIDES = ["Panna młoda", "Pan młody", "Obsługa"] as const;
type GuestSide = typeof GUEST_SIDES[number];

const GUEST_TYPE_LABELS: Record<GuestType, string> = {
  adult:       "Dorosły",
  child_half:  "Dziecko 50%",
  child_free:  "Dziecko bezpłatne",
};
const STAFF_TYPE_LABELS: Record<GuestType, string> = {
  adult:       "Pełna cena (100%)",
  child_half:  "Połowa ceny (50%)",
  child_free:  "Bezpłatnie (0%)",
};

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

/** Przesuwa partnerów tuż za sobą w obrębie danej grupy */
function buildOrderedGuests(guests: AppData["guests"]): AppData["guests"] {
  const visited = new Set<string>();
  const result: AppData["guests"][number][] = [];
  for (const g of guests) {
    if (visited.has(g.id)) continue;
    result.push(g);
    visited.add(g.id);
    if (g.partnerId) {
      const partner = guests.find(x => x.id === g.partnerId);
      if (partner && !visited.has(partner.id)) {
        result.push(partner);
        visited.add(partner.id);
      }
    }
  }
  return result;
}

export function PageGuests({ data, set, editing }: PageProps) {
  const [pairingFor, setPairingFor] = React.useState<string | null>(null);

  const vs  = data.venueSettings ?? { platePrice: "", afterPartyPlatePrice: "", deposit: "" };
  const pp  = parseFloat(vs.platePrice) || 0;
  const app = parseFloat(vs.afterPartyPlatePrice) || 0;
  const dep = parseFloat(vs.deposit) || 0;

  // mapa id → gość (do szybkiego wyszukiwania partnerów)
  const guestById: Record<string, AppData["guests"][number]> = {};
  data.guests.forEach(g => { guestById[g.id] = g; });

  const addGuest = (side: GuestSide) => set((d: AppData) => ({
    ...d,
    guests: [...d.guests, { id: "g" + Date.now(), name: "", side, rsvp: "Czeka", diet: "", guestType: "adult" as GuestType, phone: "", address: "", needsAccommodation: false, poprawiny: false }],
  }));
  const removeGuest = (id: string) => set((d: AppData) => {
    const g = d.guests.find(x => x.id === id);
    const pid = g?.partnerId;
    return {
      ...d,
      guests: d.guests
        .filter(x => x.id !== id)
        .map(x => x.id === pid ? { ...x, partnerId: undefined } : x),
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

  /** Paruje dwóch gości (ustawia partnerId na obu) */
  const pair = (idA: string, idB: string) => {
    set((d: AppData) => ({
      ...d,
      guests: d.guests.map(g =>
        g.id === idA ? { ...g, partnerId: idB } :
        g.id === idB ? { ...g, partnerId: idA } : g
      ),
    }));
    setPairingFor(null);
  };

  /** Rozparowuje gościa i jego partnera */
  const unpair = (id: string) => {
    set((d: AppData) => {
      const g = d.guests.find(x => x.id === id);
      const pid = g?.partnerId;
      return {
        ...d,
        guests: d.guests.map(x =>
          x.id === id || x.id === pid ? { ...x, partnerId: undefined } : x
        ),
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
  const pairedCount    = named.filter(g => g.partnerId && guestById[g.partnerId]?.name).length;

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

  const guestTypeTag = (gt: GuestType | undefined, isStaff: boolean): string => {
    const t = gt ?? "adult";
    if (isStaff) return t === "adult" ? "" : t === "child_half" ? "tag--warn" : "tag--no";
    return t === "adult" ? "" : t === "child_half" ? "tag--warn" : "tag--ok";
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
          { num: named.length,    label: "Łącznie" },
          { num: confirmed,       label: "Potwierdzeni" },
          { num: waiting,         label: "Oczekuje" },
          { num: declined,        label: "Odmowa" },
          { num: childCount,      label: "Dzieci" },
          { num: afterPartyCount, label: "Poprawiny" },
          { num: accom,           label: "Nocleg" },
          { num: Math.floor(pairedCount / 2), label: "Par" },
        ]}
      />

      {/* Venue settings + cost calculator */}
      <div className="card mb-24">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
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
          <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div className="row__label" style={{ marginBottom: 8 }}>Kalkulator kosztów sali</div>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <tbody>
                  {adultsCount > 0 && (
                    <tr>
                      <td className="muted">Dorośli: {adultsCount} × {pp.toLocaleString("pl-PL")} zł</td>
                      <td className="mono" style={{ textAlign: "right" }}>{(adultsCount * pp).toLocaleString("pl-PL")} zł</td>
                    </tr>
                  )}
                  {halfCount > 0 && (
                    <tr>
                      <td className="muted">Dzieci 50%: {halfCount} × {(pp * 0.5).toLocaleString("pl-PL")} zł</td>
                      <td className="mono" style={{ textAlign: "right" }}>{(halfCount * pp * 0.5).toLocaleString("pl-PL")} zł</td>
                    </tr>
                  )}
                  {freeCount > 0 && (
                    <tr>
                      <td className="muted">Dzieci bezpłatne: {freeCount}</td>
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
        const groupGuests  = bySide[side];
        const orderedGuests = buildOrderedGuests(groupGuests);
        const groupNamed   = groupGuests.filter(g => g.name).length;
        const isStaff      = side === "Obsługa";
        const typeLabels   = isStaff ? STAFF_TYPE_LABELS : GUEST_TYPE_LABELS;

        // Goście dostępni do sparowania (nie mają jeszcze partnera, nie są tym samym gościem)
        const availableForPairing = (id: string) =>
          data.guests.filter(g => g.name && g.id !== id && !g.partnerId);

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
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Imię i nazwisko</th>
                    <th>Kontakt</th>
                    <th>RSVP</th>
                    <th>Preferencje</th>
                    <th style={{ minWidth: 120 }}>Typ / cena</th>
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
                    const partner   = g.partnerId ? guestById[g.partnerId] : undefined;
                    const isPaired  = !!partner;

                    // Wyznacz czy to pierwsza osoba w parze (poprzedni wiersz nie był partnerem)
                    const prevGuest = i > 0 ? orderedGuests[i - 1] : undefined;
                    const isSecondOfPair = isPaired && prevGuest?.id === g.partnerId;
                    const isFirstOfPair  = isPaired && !isSecondOfPair;

                    const pairRowStyle: React.CSSProperties = isPaired ? {
                      background: isFirstOfPair
                        ? "oklch(from var(--accent) l c h / 0.04)"
                        : "oklch(from var(--accent) l c h / 0.07)",
                      borderLeft: "3px solid var(--accent)",
                    } : {};

                    return (
                      <tr key={g.id} style={pairRowStyle}>
                        <td className="mono muted">{String(i + 1).padStart(2, "0")}</td>
                        <td>
                          <Field value={g.name} onChange={(v) => updateGuest(g.id, { name: v })} placeholder="np. Anna Kowalska" editing={editing} inline />

                          {/* Partner badge — widok */}
                          {!editing && partner?.name && (
                            <div className="mono muted" style={{ fontSize: 10, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ color: "var(--accent)" }}>↔</span>
                              <span>{partner.name}</span>
                            </div>
                          )}

                          {editing && (
                            <div style={{ marginTop: 6 }}>
                              <Field value={g.side} onChange={(v) => updateGuest(g.id, { side: v })} editing={editing} inline options={[...GUEST_SIDES]} />
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
                              {isPaired ? (
                                /* Już sparowany */
                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                                  <span style={{ color: "var(--accent)" }}>↔</span>
                                  <span className="muted">{partner?.name || "(brak nazwy)"}</span>
                                  <button
                                    className="btn btn--ghost btn--small"
                                    onClick={() => unpair(g.id)}
                                    style={{ fontSize: 10, padding: "1px 6px", color: "var(--ink-faint)" }}
                                  >
                                    Rozłącz
                                  </button>
                                </div>
                              ) : pairingFor === g.id ? (
                                /* Wybieramy partnera */
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <select
                                    className="field__input"
                                    style={{ fontSize: 11, padding: "2px 4px" }}
                                    defaultValue=""
                                    onChange={(e) => e.target.value && pair(g.id, e.target.value)}
                                  >
                                    <option value="" disabled>Wybierz partnera…</option>
                                    {availableForPairing(g.id).map(p => (
                                      <option key={p.id} value={p.id}>{p.name} ({p.side})</option>
                                    ))}
                                  </select>
                                  <button
                                    className="btn btn--ghost btn--small"
                                    onClick={() => setPairingFor(null)}
                                    style={{ fontSize: 10, padding: "1px 6px" }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                /* Przycisk Sparuj */
                                <button
                                  className="btn btn--ghost btn--small"
                                  onClick={() => setPairingFor(g.id)}
                                  style={{ fontSize: 10, padding: "1px 6px", color: "var(--ink-faint)" }}
                                  title="Sparuj z innym gościem"
                                >
                                  ↔ Sparuj
                                </button>
                              )}
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
                              {(Object.entries(typeLabels) as [GuestType, string][]).map(([val, lbl]) => (
                                <option key={val} value={val}>{lbl}</option>
                              ))}
                            </select>
                          ) : (
                            <div>
                              {gt !== "adult" && (
                                <span className={"tag " + guestTypeTag(gt, isStaff)}>{typeLabels[gt]}</span>
                              )}
                              {gt === "adult" && isStaff && <span className="muted" style={{ fontSize: 12 }}>100%</span>}
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

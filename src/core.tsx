// Wedding Planner — core state & helpers

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ============================================================
// TYPES
// ============================================================
export interface CoupleInfo {
  partner1: string;
  partner2: string;
  date: string;
  venue: string;
  city: string;
  style: string;
}

export interface Task {
  id: string;
  title: string;
  due: string;
  done: boolean;
  category: string;
  priority: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  planned: string;
  actual: string;
  paid: boolean;
  paidDate: string;
  notes: string;
}

// guestType: "adult" = 100%, "child_half" = 50%, "child_free" = 0%
// Obsługa (staff) uses the same guestType — "adult" means full price, "child_half" means 50%
export type GuestType = "adult" | "child_half" | "child_free";

export interface Guest {
  id: string;
  name: string;
  side: string;
  rsvp: string;
  diet: string;
  guestType: GuestType;
  phone: string;
  address: string;
  needsAccommodation: boolean;
  poprawiny: boolean;
  partnerId?: string;  // ID drugiej osoby w parze (bidirectional)
}

export interface VenueSettings {
  platePrice: string;        // cena za talerzyk (dorosły), staff full
  afterPartyPlatePrice: string; // cena za talerzyk – poprawiny
  deposit: string;           // zaliczka
}

export interface TableItem {
  id: string;
  name: string;
  capacity: number;
  guests: string[];
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contact: string;
  phone: string;
  price: string;
  status: string;
  notes: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  note: string;
}

export interface MenuInfo {
  welcome: string;
  soup: string;
  main: string;
  main2: string;
  dessert: string;
  cake: string;
  drinks: string;
  midnight: string;
  notes: string;
}

export interface OutfitItem {
  id: string;
  name: string;
  where: string;
  location: string;
  price: string;
  bought: boolean;
  paid: boolean;
}

export interface OutfitsInfo {
  brideItems: OutfitItem[];
  groomItems: OutfitItem[];
  notes: string;
}

export interface InspirationItem {
  id: string;
  label: string;
  note: string;
}

export interface GiftItem {
  id: string;
  item: string;
  from: string;
  status: string;
}

export interface HoneymoonInfo {
  destination: string;
  dates: string;
  hotel: string;
  flights: string;
  budget: string;
  activities: string;
  notes: string;
}

export interface EventItem {
  id: string;
  name: string;
  date: string;
  location: string;
  note: string;
  done: boolean;
}

export interface PlaylistItem {
  id: string;
  title: string;
  artist: string;
}

export interface MusicInfo {
  firstDance: string;
  firstDanceArtist: string;
  entrance: string;
  cake: string;
  bouquet: string;
  lastDance: string;
  playlist: PlaylistItem[];
  blacklist: PlaylistItem[];
  dedications: Array<{ id: string; song: string; from: string; note: string }>;
  notes: string;
}

export interface PersonDoc {
  fullName: string;
  birthDate: string;
  birthPlace: string;
  address: string;
  id: string;
  parents: string;
}

export interface WitnessDoc {
  name: string;
  phone: string;
  id: string;
}

export interface CeremonyDoc {
  type: string;
  venue: string;
  address: string;
  officiant: string;
  date: string;
  time: string;
}

export interface DocumentEntry {
  id: string;
  name: string;
  status: string;
  note: string;
}

export interface DocumentsInfo {
  bride: PersonDoc;
  groom: PersonDoc;
  witness1: WitnessDoc;
  witness2: WitnessDoc;
  ceremony: CeremonyDoc;
  docs: DocumentEntry[];
  notes: string;
}

export interface PaymentItem {
  id: string;
  what: string;
  amount: string;
  dueDate: string;
  paid: boolean;
  paidDate: string;
  method: string;
  note: string;
}

/**
 * Soft edit lock — stored in wedding-data.json on Drive.
 * Set when a user enters edit mode, cleared on save/cancel.
 * TTL = 10 minutes (LOCK_TTL_MS in auth.tsx).
 */
export interface EditLock {
  email: string;     // who is editing
  lockedAt: number;  // Date.now() timestamp
}

export interface AppData {
  couple: CoupleInfo;
  tasks: Task[];
  budgetTotal: string;
  budgetItems: BudgetItem[];
  venueSettings: VenueSettings;
  guests: Guest[];
  tables: TableItem[];
  vendors: Vendor[];
  schedule: ScheduleItem[];
  menu: MenuInfo;
  outfits: OutfitsInfo;
  inspiration: InspirationItem[];
  gifts: GiftItem[];
  honeymoon: HoneymoonInfo;
  events: EventItem[];
  music: MusicInfo;
  documents: DocumentsInfo;
  payments: PaymentItem[];
  /** Soft edit lock — present while someone is in edit mode. */
  _editLock?: EditLock;
}

// ============================================================
// INITIAL DATA  (everything empty for user to fill)
// ============================================================
const EMPTY_DATA: AppData = {
  couple: {
    partner1: "",
    partner2: "",
    date: "",
    venue: "",
    city: "",
    style: "",
  },
  // tasks
  tasks: [
    { id: "t1", title: "", due: "", done: false, category: "Organizacja", priority: "Średni" },
    { id: "t2", title: "", due: "", done: false, category: "Sala", priority: "Wysoki" },
    { id: "t3", title: "", due: "", done: false, category: "Stroje", priority: "Średni" },
    { id: "t4", title: "", due: "", done: false, category: "Goście", priority: "Średni" },
  ],
  // budget
  budgetTotal: "",
  venueSettings: {
    platePrice: "",
    afterPartyPlatePrice: "",
    deposit: "",
  },
  budgetItems: [
    { id: "b1", category: "Sala weselna", planned: "", actual: "", paid: false, paidDate: "", notes: "" },
    { id: "b2", category: "Catering", planned: "", actual: "", paid: false, paidDate: "", notes: "" },
    { id: "b3", category: "Fotograf", planned: "", actual: "", paid: false, paidDate: "", notes: "" },
    { id: "b4", category: "Film", planned: "", actual: "", paid: false, paidDate: "", notes: "" },
    { id: "b5", category: "DJ / muzyka", planned: "", actual: "", paid: false, paidDate: "", notes: "" },
    { id: "b6", category: "Kwiaty i dekoracje", planned: "", actual: "", paid: false, paidDate: "", notes: "" },
    { id: "b8", category: "Obrączki", planned: "", actual: "", paid: false, paidDate: "", notes: "" },
    { id: "b9", category: "Zaproszenia", planned: "", actual: "", paid: false, paidDate: "", notes: "" },
    { id: "b10", category: "Tort", planned: "", actual: "", paid: false, paidDate: "", notes: "" },
  ],
  // guests
  guests: [
    { id: "g1", name: "", side: "Panna młoda", rsvp: "Czeka", diet: "", guestType: "adult" as GuestType, phone: "", address: "", needsAccommodation: false, poprawiny: false },
    { id: "g2", name: "", side: "Pan młody", rsvp: "Czeka", diet: "", guestType: "adult" as GuestType, phone: "", address: "", needsAccommodation: false, poprawiny: false },
  ],
  // tables
  tables: [
    { id: "table1", name: "Stół młodej pary", capacity: 8, guests: ["", "", "", "", "", "", "", ""] },
    { id: "table2", name: "Stół 1", capacity: 8, guests: ["", "", "", "", "", "", "", ""] },
    { id: "table3", name: "Stół 2", capacity: 8, guests: ["", "", "", "", "", "", "", ""] },
    { id: "table4", name: "Stół 3", capacity: 8, guests: ["", "", "", "", "", "", "", ""] },
  ],
  // vendors
  vendors: [
    { id: "v1", name: "", category: "Sala weselna", contact: "", phone: "", price: "", status: "Szukam", notes: "" },
    { id: "v2", name: "", category: "Fotograf", contact: "", phone: "", price: "", status: "Szukam", notes: "" },
    { id: "v3", name: "", category: "Film", contact: "", phone: "", price: "", status: "Szukam", notes: "" },
    { id: "v4", name: "", category: "DJ", contact: "", phone: "", price: "", status: "Szukam", notes: "" },
    { id: "v5", name: "", category: "Catering", contact: "", phone: "", price: "", status: "Szukam", notes: "" },
    { id: "v6", name: "", category: "Kwiaciarnia", contact: "", phone: "", price: "", status: "Szukam", notes: "" },
    { id: "v7", name: "", category: "Tort", contact: "", phone: "", price: "", status: "Szukam", notes: "" },
    { id: "v8", name: "", category: "Cukiernia", contact: "", phone: "", price: "", status: "Szukam", notes: "" },
  ],
  // schedule
  schedule: [
    { id: "s1", time: "", title: "Przygotowania panny młodej", note: "" },
    { id: "s2", time: "", title: "Przygotowania pana młodego", note: "" },
    { id: "s3", time: "", title: "Ceremonia ślubna", note: "" },
    { id: "s4", time: "", title: "Sesja zdjęciowa", note: "" },
    { id: "s5", time: "", title: "Przyjęcie weselne", note: "" },
    { id: "s6", time: "", title: "Powitanie gości", note: "" },
    { id: "s7", time: "", title: "Pierwszy taniec", note: "" },
    { id: "s8", time: "", title: "Tort weselny", note: "" },
    { id: "s9", time: "", title: "Oczepiny", note: "" },
    { id: "s10", time: "", title: "Poprawiny", note: "" },
  ],
  // menu
  menu: {
    welcome: "",
    soup: "",
    main: "",
    main2: "",
    dessert: "",
    cake: "",
    drinks: "",
    midnight: "",
    notes: "",
  },
  // outfits
  outfits: {
    brideItems: [
      { id: "boi1", name: "Suknia ślubna", where: "", location: "", price: "", bought: false, paid: false },
      { id: "boi2", name: "Welon", where: "", location: "", price: "", bought: false, paid: false },
      { id: "boi3", name: "Buty", where: "", location: "", price: "", bought: false, paid: false },
      { id: "boi4", name: "Biżuteria", where: "", location: "", price: "", bought: false, paid: false },
      { id: "boi5", name: "Bielizna", where: "", location: "", price: "", bought: false, paid: false },
      { id: "boi6", name: "Bukiet", where: "", location: "", price: "", bought: false, paid: false },
      { id: "boi7", name: "Fryzura", where: "", location: "", price: "", bought: false, paid: false },
      { id: "boi8", name: "Makijaż", where: "", location: "", price: "", bought: false, paid: false },
    ],
    groomItems: [
      { id: "goi1", name: "Garnitur", where: "", location: "", price: "", bought: false, paid: false },
      { id: "goi2", name: "Koszula", where: "", location: "", price: "", bought: false, paid: false },
      { id: "goi3", name: "Krawat / muszka", where: "", location: "", price: "", bought: false, paid: false },
      { id: "goi4", name: "Buty", where: "", location: "", price: "", bought: false, paid: false },
      { id: "goi5", name: "Pasek", where: "", location: "", price: "", bought: false, paid: false },
      { id: "goi6", name: "Zegarek", where: "", location: "", price: "", bought: false, paid: false },
      { id: "goi7", name: "Butonierka", where: "", location: "", price: "", bought: false, paid: false },
    ],
    notes: "",
  },
  // inspiration
  inspiration: [
    { id: "i1", label: "Bukiet ślubny", note: "" },
    { id: "i2", label: "Dekoracje stołów", note: "" },
    { id: "i3", label: "Suknia ślubna", note: "" },
    { id: "i4", label: "Tort", note: "" },
    { id: "i5", label: "Aranżacja sali", note: "" },
    { id: "i6", label: "Zaproszenia", note: "" },
  ],
  // gifts
  gifts: [
    { id: "gi1", item: "", from: "", status: "Życzenie" },
    { id: "gi2", item: "", from: "", status: "Życzenie" },
    { id: "gi3", item: "", from: "", status: "Życzenie" },
  ],
  // honeymoon
  honeymoon: {
    destination: "",
    dates: "",
    hotel: "",
    flights: "",
    budget: "",
    activities: "",
    notes: "",
  },
  // events: bachelor/bachelorette/ceremony/reception
  events: [
    { id: "ev1", name: "Wieczór kawalerski", date: "", location: "", note: "", done: false },
    { id: "ev2", name: "Wieczór panieński", date: "", location: "", note: "", done: false },
    { id: "ev3", name: "Ślub (ceremonia)", date: "", location: "", note: "", done: false },
    { id: "ev4", name: "Wesele", date: "", location: "", note: "", done: false },
    { id: "ev5", name: "Poprawiny", date: "", location: "", note: "", done: false },
  ],
  // music
  music: {
    firstDance: "",
    firstDanceArtist: "",
    entrance: "",
    cake: "",
    bouquet: "",
    lastDance: "",
    playlist: [
      { id: "p1", title: "", artist: "" },
      { id: "p2", title: "", artist: "" },
      { id: "p3", title: "", artist: "" },
    ],
    blacklist: [
      { id: "bl1", title: "", artist: "" },
    ],
    dedications: [
      { id: "d1", song: "", from: "", note: "" },
    ],
    notes: "",
  },
  // documents / formalities
  documents: {
    bride: { fullName: "", birthDate: "", birthPlace: "", address: "", id: "", parents: "" },
    groom: { fullName: "", birthDate: "", birthPlace: "", address: "", id: "", parents: "" },
    witness1: { name: "", phone: "", id: "" },
    witness2: { name: "", phone: "", id: "" },
    ceremony: {
      type: "",
      venue: "",
      address: "",
      officiant: "",
      date: "",
      time: "",
    },
    docs: [
      { id: "doc1", name: "Akty urodzenia", status: "Do zebrania", note: "" },
      { id: "doc2", name: "Dowody osobiste", status: "Do zebrania", note: "" },
      { id: "doc3", name: "Zaświadczenia o stanie wolnym (USC)", status: "Do zebrania", note: "" },
      { id: "doc4", name: "Zapowiedzi (kościół)", status: "Do zebrania", note: "" },
      { id: "doc5", name: "Świadectwo chrztu", status: "Do zebrania", note: "" },
      { id: "doc6", name: "Świadectwo bierzmowania", status: "Do zebrania", note: "" },
      { id: "doc7", name: "Zaświadczenie z nauk przedmałżeńskich", status: "Do zebrania", note: "" },
    ],
    notes: "",
  },
  // payments — schedule of advances/installments tied to vendors/categories
  payments: [
    { id: "pay1", what: "Zaliczka — sala weselna", amount: "", dueDate: "", paid: false, paidDate: "", method: "Przelew", note: "" },
    { id: "pay2", what: "Zaliczka — fotograf", amount: "", dueDate: "", paid: false, paidDate: "", method: "Przelew", note: "" },
    { id: "pay3", what: "Zaliczka — DJ", amount: "", dueDate: "", paid: false, paidDate: "", method: "Przelew", note: "" },
    { id: "pay4", what: "Końcowa płatność — sala", amount: "", dueDate: "", paid: false, paidDate: "", method: "Przelew", note: "" },
  ],
};

// ============================================================
// PAGES META
// ============================================================
export interface PageMeta {
  id: string;
  label: string;
  group: string;
}

const PAGES: PageMeta[] = [
  { id: "dashboard", label: "Przegląd", group: "Główne" },
  { id: "tasks", label: "Zadania", group: "Główne" },
  { id: "events", label: "Wydarzenia", group: "Główne" },
  { id: "budget", label: "Budżet", group: "Finanse" },
  { id: "payments", label: "Płatności", group: "Finanse" },
  { id: "guests", label: "Lista gości", group: "Ludzie" },
  { id: "tables", label: "Plan stołów", group: "Ludzie" },
  { id: "vendors", label: "Dostawcy", group: "Ludzie" },
  { id: "schedule", label: "Harmonogram", group: "Dzień ślubu" },
  { id: "menu", label: "Menu i tort", group: "Dzień ślubu" },
  { id: "music", label: "Muzyka", group: "Dzień ślubu" },
  { id: "outfits", label: "Stroje", group: "Dzień ślubu" },
  { id: "documents", label: "Dokumenty / USC", group: "Formalności" },
  { id: "inspiration", label: "Inspiracje", group: "Ekstra" },
  { id: "gifts", label: "Prezenty", group: "Ekstra" },
  { id: "honeymoon", label: "Podróż poślubna", group: "Ekstra" },
];

// ============================================================
// SHARED PAGE PROPS TYPE
// ============================================================
export type DataUpdater = AppData | ((prev: AppData) => AppData);

export interface PageProps {
  data: AppData;
  set: (updater: DataUpdater) => void;
  editing: boolean;
}

// ============================================================
// EDITABLE FIELD COMPONENT
// ============================================================
interface FieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  editing?: boolean;
  multiline?: boolean;
  inline?: boolean;
  type?: string;
  options?: string[];
  className?: string;
  prefix?: string;
  suffix?: string;
}

function Field({ value, onChange, placeholder, editing, multiline, inline, type, options, className, prefix, suffix }: FieldProps) {
  const isEmpty = !value || value === "";
  const cls = [
    "field",
    multiline ? "" : (inline ? "field--inline" : "field--block"),
    isEmpty ? "field--empty" : "",
    editing ? "is-editing" : "",
    className || ""
  ].filter(Boolean).join(" ");

  if (editing) {
    if (options) {
      return (
        <span className={cls}>
          <select
            className="field__input"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          >
            {!value && <option value="">— wybierz —</option>}
            {options.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </span>
      );
    }
    if (multiline) {
      return (
        <span className={cls}>
          <textarea
            className="field__input"
            value={value || ""}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </span>
      );
    }
    return (
      <span className={cls}>
        <input
          type={type || "text"}
          className="field__input"
          value={value || ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
    );
  }

  // read mode
  return (
    <span className={cls}>
      <span className="field__value">
        {prefix && !isEmpty ? prefix : ""}
        {isEmpty ? (placeholder || "—") : value}
        {suffix && !isEmpty ? suffix : ""}
      </span>
    </span>
  );
}

// ============================================================
// CHECK
// ============================================================
interface CheckProps {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function Check({ on, onClick, disabled }: CheckProps) {
  return (
    <button
      type="button"
      className={"check " + (on ? "is-on" : "")}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={on}
    >
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 6.5 L5 9 L10 3" />
      </svg>
    </button>
  );
}

// ============================================================
// ICON
// ============================================================
type IconName = "edit" | "save" | "x" | "plus" | "menu" | "moon" | "sun" | "trash" | "check" | "chev";

interface IconProps {
  name: IconName;
  size?: number;
}

function Icon({ name, size = 16 }: IconProps) {
  const paths: Record<IconName, string> = {
    edit: "M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z",
    save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
    x: "M18 6 6 18M6 6l12 12",
    plus: "M12 5v14M5 12h14",
    menu: "M3 6h18M3 12h18M3 18h18",
    moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
    sun: "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
    trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    check: "M20 6 9 17l-5-5",
    chev: "M9 18l6-6-6-6",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}

// ============================================================
// FORMATTERS
// ============================================================
function fmtCurrency(v: string | number): string {
  if (!v) return "—";
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
  if (isNaN(n)) return String(v);
  return n.toLocaleString("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 });
}
function fmtDate(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}
function daysUntil(s: string): number | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================
// OUTFIT TOTALS — used by Outfits page, Budget and Dashboard
// ============================================================
interface OutfitTotals {
  planned: number;
  paid: number;
  bought: number;
  total: number;
}

interface AllOutfitTotals extends OutfitTotals {
  bride: OutfitTotals;
  groom: OutfitTotals;
}

function outfitTotals(items: OutfitItem[]): OutfitTotals {
  let planned = 0, paid = 0, bought = 0;
  (items || []).forEach(it => {
    const p = parseFloat(it.price) || 0;
    planned += p;
    if (it.paid) paid += p;
    if (it.bought) bought++;
  });
  return { planned, paid, bought, total: (items || []).length };
}

function allOutfitTotals(data: AppData): AllOutfitTotals {
  const b = outfitTotals(data?.outfits?.brideItems);
  const g = outfitTotals(data?.outfits?.groomItems);
  return {
    planned: b.planned + g.planned,
    paid: b.paid + g.paid,
    bought: b.bought + g.bought,
    total: b.total + g.total,
    bride: b,
    groom: g,
  };
}

export interface VenueCosts {
  planned:       number;   // totalCost + afterPartyCost
  paid:          number;   // deposit zapłacony
  totalCost:     number;   // koszt sali (wesele)
  afterPartyCost:number;   // koszt sali (poprawiny)
  deposit:       number;   // zaliczka
  guestCount:    number;   // aktywni goście (bez odmów)
  afterPartyCount: number; // goście na poprawinach
  hasData:       boolean;  // czy warto w ogóle pokazywać wiersz
}

function calcVenueCosts(data: AppData): VenueCosts {
  const vs  = data.venueSettings ?? { platePrice: "", afterPartyPlatePrice: "", deposit: "" };
  const pp  = parseFloat(vs.platePrice) || 0;
  const app = parseFloat(vs.afterPartyPlatePrice) || 0;
  const dep = parseFloat(vs.deposit) || 0;

  const named  = (data.guests || []).filter(g => g.name);
  const active = named.filter(g => g.rsvp !== "Odmowa");

  const adultsCount     = active.filter(g => !g.guestType || g.guestType === "adult").length;
  const halfCount       = active.filter(g => g.guestType === "child_half").length;
  const afterPartyCount = named.filter(g => g.poprawiny).length;

  const totalCost       = pp > 0 ? (adultsCount * pp) + (halfCount * pp * 0.5) : 0;
  const afterPartyCost  = app > 0 ? afterPartyCount * app : 0;

  return {
    planned:        totalCost + afterPartyCost,
    paid:           dep,
    totalCost,
    afterPartyCost,
    deposit:        dep,
    guestCount:     active.length,
    afterPartyCount,
    hasData:        pp > 0 && active.length > 0,
  };
}

export {
  EMPTY_DATA, PAGES, Field, Check, Icon,
  fmtCurrency, fmtDate, daysUntil,
  outfitTotals, allOutfitTotals, calcVenueCosts,
};

import type { CartItem } from "@/types/pos";

/** Tarif hari ke-2 dst = tarif hari pertama × faktor ini (flyer: +20% per hari tambahan). */
export const EXTRA_DAY_PRICE_FACTOR = 1.2;

const BASE_LATE_FEE_RATE = 0.2;
const NORMAL_LATE_FEE_BASE_FACTOR = 1;
const LIGHTING_LATE_FEE_BASE_FACTOR = 0.5;

const normalizeCategory = (categoryName?: string) => (categoryName ?? "").trim().toLowerCase();

export const isConsumableCategory = (categoryName?: string) => {
  const normalized = normalizeCategory(categoryName);
  return (
    normalized.includes("sekali pakai") ||
    normalized.includes("consumable") ||
    normalized.includes("habis pakai")
  );
};

export const isLightingCategory = (categoryName?: string) => {
  const normalized = normalizeCategory(categoryName);
  return (
    normalized.includes("perlampuan") ||
    normalized.includes("penerangan") ||
    normalized.includes("lampu") ||
    normalized.includes("lighting")
  );
};

/**
 * Regulasi:
 * - Denda dasar 20% per hari dari nilai sewa.
 * - Kategori normal: 100% dasar tarif (faktor 1.0).
 * - Kategori perlampuan: 50% dasar tarif (faktor 0.5).
 * - Kategori sekali pakai: bebas denda (faktor 0).
 */
export const getLateFeeRate = (categoryName?: string) => {
  if (isConsumableCategory(categoryName)) return 0;
  if (isLightingCategory(categoryName)) {
    return BASE_LATE_FEE_RATE * LIGHTING_LATE_FEE_BASE_FACTOR;
  }
  return BASE_LATE_FEE_RATE * NORMAL_LATE_FEE_BASE_FACTOR;
};

export const parseLocalDateFromInput = (isoDate: string): Date => {
  const [y, m, d] = isoDate.split("-").map((part) => Number(part));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
};

/** Selisih kalender dalam hari dari a ke b (b lebih awal bisa negatif). */
export const calendarDaysDiff = (a: Date, b: Date): number => {
  const ms = 86_400_000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / ms);
};

/**
 * Lama sewa inklusif: hari ambil dan hari kembali rencana dihitung penuh (min 1 hari).
 */
export const inclusiveRentalDays = (pickupIso: string, returnDueIso: string): number => {
  const pickup = parseLocalDateFromInput(pickupIso);
  const returnDue = parseLocalDateFromInput(returnDueIso);
  if (Number.isNaN(pickup.getTime()) || Number.isNaN(returnDue.getTime())) {
    throw new Error("Tanggal tidak valid.");
  }
  if (calendarDaysDiff(pickup, returnDue) < 0) {
    throw new Error("Tanggal kembali tidak boleh sebelum tanggal ambil.");
  }
  return calendarDaysDiff(pickup, returnDue) + 1;
};

/**
 * Hari terlambat: hanya tanggal (melewati hari rencana kembali = 1 hari, dst).
 */
export const lateDaysFromActualReturn = (returnDueIso: string, actualReturnIso: string): number => {
  const returnDue = parseLocalDateFromInput(returnDueIso);
  const actual = parseLocalDateFromInput(actualReturnIso);
  if (Number.isNaN(returnDue.getTime()) || Number.isNaN(actual.getTime())) {
    throw new Error("Tanggal kembali tidak valid.");
  }
  return Math.max(0, calendarDaysDiff(returnDue, actual));
};

/** 28–31 Des: tarif leaflet resmi tidak berlaku — bisa dikalikan via env untuk tarif khusus. */
export const isYearEndHolidayPickup = (pickupIso: string): boolean => {
  const pickup = parseLocalDateFromInput(pickupIso);
  if (Number.isNaN(pickup.getTime())) return false;
  return pickup.getMonth() === 11 && pickup.getDate() >= 28 && pickup.getDate() <= 31;
};

export const getYearEndRentalMultiplier = (): number => {
  const raw = process.env.NEXT_PUBLIC_RENTAL_YEAR_END_MULTIPLIER;
  if (raw === undefined || raw === "") return 1;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

export const cartFirstDaySubtotal = (cart: CartItem[]): number =>
  cart.reduce((sum, item) => sum + item.price * item.qty, 0);

export const computeRentalLineTotal = (price: number, qty: number, rentalDays: number): number => {
  const days = Math.max(1, Math.floor(rentalDays));
  const multiplier = 1 + EXTRA_DAY_PRICE_FACTOR * Math.max(0, days - 1);
  return price * qty * multiplier;
};

export const computeRentalSubtotalBeforeHoliday = (cart: CartItem[], rentalDays: number): number =>
  cart.reduce((sum, item) => sum + computeRentalLineTotal(item.price, item.qty, rentalDays), 0);

export const applyHolidayMultiplier = (amount: number, multiplier: number): number =>
  Math.round(amount * multiplier);

export const calculateLateFee = (
  cart: CartItem[],
  rentalDays: number,
  lateDays: number,
  holidayMultiplier: number,
) => {
  if (!Number.isFinite(lateDays) || lateDays <= 0) return 0;

  const sanitizedLateDays = Math.floor(lateDays);
  const mult = Number.isFinite(holidayMultiplier) && holidayMultiplier > 0 ? holidayMultiplier : 1;

  const lateFeePerDay = cart.reduce((sum, item) => {
    const lineRental = computeRentalLineTotal(item.price, item.qty, rentalDays);
    const lineBase = Math.round(lineRental * mult);
    return sum + lineBase * getLateFeeRate(item.categoryName);
  }, 0);

  return lateFeePerDay * sanitizedLateDays;
};

export type LateFeeKind = "none" | "standard" | "lighting";

export const lateFeeKind = (categoryName?: string): LateFeeKind => {
  if (isConsumableCategory(categoryName)) return "none";
  if (isLightingCategory(categoryName)) return "lighting";
  return "standard";
};

export const cartHasMixedLateFeeRules = (cart: CartItem[]): boolean => {
  const kinds = new Set(cart.map((item) => lateFeeKind(item.categoryName)));
  kinds.delete("none");
  return kinds.size > 1;
};

import type { CartItem, TransactionItem } from "@/types/pos";

/** Tarif hari ke-2 dst = tarif hari pertama (faktor 1.0). */
export const EXTRA_DAY_PRICE_FACTOR = 1.0;

const NORMAL_LATE_FEE_RATE = 0.2;
const LIGHTING_LATE_FEE_RATE = 0.5;

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

export const cartFirstDaySubtotal = (cart: CartItem[]): number =>
  cart.reduce((sum, item) => sum + item.price * item.qty, 0);

export const computeRentalLineTotal = (price: number, qty: number, rentalDays: number): number => {
  const days = Math.max(1, Math.floor(rentalDays));
  const multiplier = 1 + EXTRA_DAY_PRICE_FACTOR * Math.max(0, days - 1);
  return price * qty * multiplier;
};

export const computeRentalSubtotal = (cart: CartItem[], rentalDays: number): number =>
  cart.reduce((sum, item) => sum + computeRentalLineTotal(item.price, item.qty, rentalDays), 0);

export const calculateItemLateFee = (
  item: TransactionItem,
  rentalDays: number,
  lateDays: number,
): number => {
  if (!Number.isFinite(lateDays) || lateDays <= 0) return 0;

  const sanitizedLateDays = Math.floor(lateDays);

  if (isConsumableCategory(item.categoryName)) {
    return 0;
  }

  if (isLightingCategory(item.categoryName)) {
    const itemBasePrice = item.price * item.qty;
    return Math.round(itemBasePrice * LIGHTING_LATE_FEE_RATE) * sanitizedLateDays;
  }

  const lineRental = computeRentalLineTotal(item.price, item.qty, rentalDays);
  const lineBase = Math.round(lineRental);
  return Math.round(lineBase * NORMAL_LATE_FEE_RATE) * sanitizedLateDays;
};

export const calculateLateFee = (
  cart: TransactionItem[],
  rentalDays: number,
  lateDays: number,
) => {
  if (!Number.isFinite(lateDays) || lateDays <= 0) return 0;
  return cart.reduce((sum, item) => sum + calculateItemLateFee(item, rentalDays, lateDays), 0);
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

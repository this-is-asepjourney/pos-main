import type { FirestoreDate } from "@/types/pos";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID").format(value);

export const toDate = (value: FirestoreDate): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  return value.toDate();
};

export const formatDateTime = (value: FirestoreDate) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(toDate(value));

export const formatShortDate = (value: FirestoreDate) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(toDate(value));

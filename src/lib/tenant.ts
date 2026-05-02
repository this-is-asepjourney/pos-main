import { collection, doc, type CollectionReference, type DocumentReference } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const DEMO_TENANT_ID = "demo";
export const DEFAULT_BRANCH_ID = "main";

export const tenantDoc = (tenantId: string): DocumentReference =>
  doc(db, "tenants", tenantId);

export const tenantSubCol = (tenantId: string, name: string): CollectionReference =>
  collection(db, "tenants", tenantId, name);

export const productsCol = (tenantId: string) => tenantSubCol(tenantId, "products");
export const categoriesCol = (tenantId: string) => tenantSubCol(tenantId, "categories");
export const transactionsCol = (tenantId: string) => tenantSubCol(tenantId, "transactions");
export const attendanceCol = (tenantId: string) => tenantSubCol(tenantId, "attendance");
export const branchesCol = (tenantId: string) => tenantSubCol(tenantId, "branches");
export const membersCol = (tenantId: string) => tenantSubCol(tenantId, "members");
export const reportsDailyCol = (tenantId: string) => tenantSubCol(tenantId, "reports_daily");

export const productDoc = (tenantId: string, productId: string) =>
  doc(db, "tenants", tenantId, "products", productId);
export const categoryDoc = (tenantId: string, categoryId: string) =>
  doc(db, "tenants", tenantId, "categories", categoryId);
export const transactionDoc = (tenantId: string, transactionId: string) =>
  doc(db, "tenants", tenantId, "transactions", transactionId);
export const attendanceDoc = (tenantId: string, attendanceId: string) =>
  doc(db, "tenants", tenantId, "attendance", attendanceId);
export const branchDoc = (tenantId: string, branchId: string) =>
  doc(db, "tenants", tenantId, "branches", branchId);
export const memberDoc = (tenantId: string, uid: string) =>
  doc(db, "tenants", tenantId, "members", uid);

export const isDemoTenant = (tenantId: string | null | undefined): boolean =>
  !tenantId || tenantId === DEMO_TENANT_ID;

export const buildDateKey = (date: Date): string =>
  date.toISOString().slice(0, 10);

export const buildMonthKey = (date: Date): string =>
  date.toISOString().slice(0, 7);

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40) || "tenant";

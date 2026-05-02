/**
 * Migration script: legacy flat collections → multi-tenant subcollections.
 *
 * USAGE:
 *   1. Install deps:  npm i -D ts-node firebase-admin tsx
 *   2. Letakkan service-account key di scripts/serviceAccount.json
 *      (dapatkan di Firebase Console → Project Settings → Service Accounts)
 *   3. Edit konstanta LEGACY_TENANT_ID, OWNER_UID, TENANT_NAME di bawah.
 *   4. Jalankan:
 *        npx tsx scripts/migrate-to-multitenant.ts
 *
 * Skrip ini idempoten untuk dokumen yang sudah dipindahkan (set, bukan add).
 * Tetap WAJIB di-test di staging dulu.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import path from "node:path";
import fs from "node:fs";

// ============================================================================
// KONFIGURASI — UBAH SESUAI PROJECT
// ============================================================================
const LEGACY_TENANT_ID = "tenant-legacy-001";
const TENANT_NAME = "Toko Saya";
const OWNER_UID = "REPLACE_WITH_OWNER_UID";
const DEFAULT_BRANCH_ID = "main";
// ============================================================================

const serviceAccountPath = path.join(__dirname, "serviceAccount.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error(
    "[ERROR] scripts/serviceAccount.json tidak ditemukan. Letakkan service-account key Firebase Anda di sana.",
  );
  process.exit(1);
}

initializeApp({
  credential: cert(JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"))),
});

const db = getFirestore();
const auth = getAuth();

const buildDateKey = (date: Date) => date.toISOString().slice(0, 10);
const buildMonthKey = (date: Date) => date.toISOString().slice(0, 7);

const toJsDate = (value: unknown): Date => {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  return new Date();
};

async function ensureTenant() {
  const tenantRef = db.doc(`tenants/${LEGACY_TENANT_ID}`);
  const snap = await tenantRef.get();
  if (snap.exists) {
    console.log(`[skip] Tenant ${LEGACY_TENANT_ID} sudah ada.`);
    return;
  }
  await tenantRef.set({
    name: TENANT_NAME,
    slug: LEGACY_TENANT_ID,
    ownerUid: OWNER_UID,
    status: "active",
    plan: "pro",
    branchCount: 1,
    settings: {
      currency: "IDR",
      taxRate: 0,
      timezone: "Asia/Jakarta",
      receiptFooter: `Terima kasih, ${TENANT_NAME}.`,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await db.doc(`tenants/${LEGACY_TENANT_ID}/branches/${DEFAULT_BRANCH_ID}`).set({
    name: "Cabang Utama",
    address: "",
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  await db.doc(`subscriptions/${LEGACY_TENANT_ID}`).set({
    tenantId: LEGACY_TENANT_ID,
    planId: "pro",
    status: "active",
    currentPeriodStart: FieldValue.serverTimestamp(),
    currentPeriodEnd: Timestamp.fromDate(
      new Date(Date.now() + 365 * 86_400_000),
    ),
  });
  console.log(`[ok] Tenant ${LEGACY_TENANT_ID} dibuat.`);
}

async function migrateUsersAndMembers() {
  const usersSnap = await db.collection("users").get();
  console.log(`[info] Memigrasi ${usersSnap.size} user.`);

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const uid = doc.id;
    const isOwner = uid === OWNER_UID;
    const role: "owner" | "admin" | "cashier" = isOwner
      ? "owner"
      : data.role === "admin"
      ? "admin"
      : "cashier";

    await db.doc(`users/${uid}`).set(
      {
        uid,
        email: data.email ?? null,
        name: data.name ?? data.email ?? "User",
        defaultTenantId: LEGACY_TENANT_ID,
        tenantIds: [LEGACY_TENANT_ID],
        createdAt: data.createdAt ?? FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await db
      .doc(`tenants/${LEGACY_TENANT_ID}/members/${uid}`)
      .set({
        uid,
        email: data.email ?? null,
        name: data.name ?? data.email ?? "User",
        role,
        branchIds: ["*"],
        status: "active",
        joinedAt: FieldValue.serverTimestamp(),
      });

    try {
      await auth.setCustomUserClaims(uid, {
        tenantId: LEGACY_TENANT_ID,
        role,
        branchIds: ["*"],
      });
      // Force refresh token user di sesi berikutnya.
      await auth.revokeRefreshTokens(uid);
    } catch (error) {
      console.warn(
        `[warn] Gagal set claims untuk uid ${uid}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

async function moveCollection<TIn extends Record<string, unknown>>(
  src: string,
  dst: string,
  transform?: (data: TIn, id: string) => Record<string, unknown>,
) {
  const snap = await db.collection(src).get();
  const writer = db.bulkWriter();
  for (const doc of snap.docs) {
    const data = doc.data() as TIn;
    const transformed = transform ? transform(data, doc.id) : data;
    writer.set(
      db.doc(`tenants/${LEGACY_TENANT_ID}/${dst}/${doc.id}`),
      transformed,
    );
  }
  await writer.close();
  console.log(`[ok] ${snap.size} dokumen dipindahkan: ${src} → ${dst}`);
}

async function migrateCollections() {
  await moveCollection("categories", "categories");

  await moveCollection<Record<string, unknown>>("products", "products", (data) => {
    const stock = Number(data.stock ?? 0);
    return {
      ...data,
      nameLower: typeof data.name === "string" ? data.name.toLowerCase() : "",
      isActive: data.isActive ?? true,
      stockByBranch: { [DEFAULT_BRANCH_ID]: stock },
      totalStock: stock,
    };
  });

  await moveCollection<Record<string, unknown>>(
    "transactions",
    "transactions",
    (data) => {
      const created = toJsDate(data.createdAt);
      return {
        ...data,
        branchId: DEFAULT_BRANCH_ID,
        status: data.status ?? "completed",
        dateKey: buildDateKey(created),
        monthKey: buildMonthKey(created),
      };
    },
  );

  await moveCollection<Record<string, unknown>>(
    "attendance",
    "attendance",
    (data) => ({ ...data, branchId: DEFAULT_BRANCH_ID }),
  );
}

async function main() {
  if (OWNER_UID === "REPLACE_WITH_OWNER_UID") {
    console.error("[ERROR] Harap set OWNER_UID terlebih dahulu di skrip ini.");
    process.exit(1);
  }

  await ensureTenant();
  await migrateUsersAndMembers();
  await migrateCollections();
  console.log(
    "\n[done] Migrasi selesai. Periksa Firestore Console, lalu hapus koleksi flat lama bila sudah aman.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

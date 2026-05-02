import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

type SetActiveTenantPayload = { tenantId: string };

export const setActiveTenant = onCall<SetActiveTenantPayload>(
  { region: "asia-southeast1" },
  async (request) => {
    const uid = request.auth?.uid;
    const { tenantId } = request.data ?? {};

    if (!uid) {
      throw new HttpsError("unauthenticated", "Login terlebih dahulu.");
    }
    if (!tenantId) {
      throw new HttpsError("invalid-argument", "tenantId wajib diisi.");
    }

    const memberRef = getFirestore()
      .doc(`tenants/${tenantId}/members/${uid}`);
    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
      throw new HttpsError("permission-denied", "Anda bukan anggota tenant ini.");
    }

    const data = memberSnap.data()!;
    if (data.status !== "active") {
      throw new HttpsError("permission-denied", "Akun Anda di tenant ini nonaktif.");
    }

    await getAuth().setCustomUserClaims(uid, {
      tenantId,
      role: data.role,
      branchIds: data.branchIds ?? ["*"],
    });

    await getFirestore()
      .doc(`users/${uid}`)
      .set(
        { defaultTenantId: tenantId, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );

    return { ok: true, tenantId, role: data.role };
  },
);

// Helper opsional untuk owner agar bisa "force refresh" claims dirinya sendiri
// setelah upgrade plan / pindah branch tanpa perlu logout.
export const syncTenantClaims = onCall<{ tenantId?: string }>(
  { region: "asia-southeast1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Login terlebih dahulu.");

    const tenantId = request.data?.tenantId
      ?? (await getFirestore().doc(`users/${uid}`).get()).data()?.defaultTenantId;
    if (!tenantId) throw new HttpsError("failed-precondition", "Belum punya tenant aktif.");

    const memberSnap = await getFirestore()
      .doc(`tenants/${tenantId}/members/${uid}`)
      .get();
    if (!memberSnap.exists) {
      throw new HttpsError("permission-denied", "Membership tidak ditemukan.");
    }
    const data = memberSnap.data()!;

    await getAuth().setCustomUserClaims(uid, {
      tenantId,
      role: data.role,
      branchIds: data.branchIds ?? ["*"],
    });
    return { ok: true };
  },
);

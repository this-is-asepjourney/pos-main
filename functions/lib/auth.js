"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncTenantClaims = exports.setActiveTenant = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
exports.setActiveTenant = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
    const uid = request.auth?.uid;
    const { tenantId } = request.data ?? {};
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Login terlebih dahulu.");
    }
    if (!tenantId) {
        throw new https_1.HttpsError("invalid-argument", "tenantId wajib diisi.");
    }
    const memberRef = (0, firestore_1.getFirestore)()
        .doc(`tenants/${tenantId}/members/${uid}`);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
        throw new https_1.HttpsError("permission-denied", "Anda bukan anggota tenant ini.");
    }
    const data = memberSnap.data();
    if (data.status !== "active") {
        throw new https_1.HttpsError("permission-denied", "Akun Anda di tenant ini nonaktif.");
    }
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, {
        tenantId,
        role: data.role,
        branchIds: data.branchIds ?? ["*"],
    });
    await (0, firestore_1.getFirestore)()
        .doc(`users/${uid}`)
        .set({ defaultTenantId: tenantId, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, tenantId, role: data.role };
});
// Helper opsional untuk owner agar bisa "force refresh" claims dirinya sendiri
// setelah upgrade plan / pindah branch tanpa perlu logout.
exports.syncTenantClaims = (0, https_1.onCall)({ region: "asia-southeast1" }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login terlebih dahulu.");
    const tenantId = request.data?.tenantId
        ?? (await (0, firestore_1.getFirestore)().doc(`users/${uid}`).get()).data()?.defaultTenantId;
    if (!tenantId)
        throw new https_1.HttpsError("failed-precondition", "Belum punya tenant aktif.");
    const memberSnap = await (0, firestore_1.getFirestore)()
        .doc(`tenants/${tenantId}/members/${uid}`)
        .get();
    if (!memberSnap.exists) {
        throw new https_1.HttpsError("permission-denied", "Membership tidak ditemukan.");
    }
    const data = memberSnap.data();
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, {
        tenantId,
        role: data.role,
        branchIds: data.branchIds ?? ["*"],
    });
    return { ok: true };
});

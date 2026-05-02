"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMemberWritten = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const auth_1 = require("firebase-admin/auth");
const firestore_2 = require("firebase-admin/firestore");
// Sinkronisasi otomatis:
// - Saat membership baru dibuat → tambahkan tenantId ke /users/{uid}.tenantIds.
// - Saat membership di-update (misal role/branchIds berubah) dan user sedang
//   memakai tenant ini sebagai tenant aktif → refresh custom claims-nya.
// - Saat membership dihapus / dinonaktifkan → revoke claims jika sedang aktif.
exports.onMemberWritten = (0, firestore_1.onDocumentWritten)({
    document: "tenants/{tid}/members/{uid}",
    region: "asia-southeast1",
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const { tid, uid } = event.params;
    const userRef = (0, firestore_2.getFirestore)().doc(`users/${uid}`);
    if (after) {
        await userRef.set({
            uid,
            tenantIds: firestore_2.FieldValue.arrayUnion(tid),
            email: after.email ?? before?.email ?? null,
            name: after.name ?? before?.name ?? null,
        }, { merge: true });
        let tokenInfo;
        try {
            tokenInfo = await (0, auth_1.getAuth)().getUser(uid);
        }
        catch {
            return;
        }
        const claims = (tokenInfo.customClaims ?? {});
        if (claims.tenantId === tid) {
            if (after.status === "active") {
                await (0, auth_1.getAuth)().setCustomUserClaims(uid, {
                    tenantId: tid,
                    role: after.role,
                    branchIds: after.branchIds ?? ["*"],
                });
            }
            else {
                await (0, auth_1.getAuth)().setCustomUserClaims(uid, null);
            }
        }
        return;
    }
    if (before && !after) {
        await userRef.set({ tenantIds: firestore_2.FieldValue.arrayRemove(tid) }, { merge: true });
        try {
            const tokenInfo = await (0, auth_1.getAuth)().getUser(uid);
            const claims = (tokenInfo.customClaims ?? {});
            if (claims.tenantId === tid) {
                await (0, auth_1.getAuth)().setCustomUserClaims(uid, null);
            }
        }
        catch {
            /* ignore */
        }
    }
});

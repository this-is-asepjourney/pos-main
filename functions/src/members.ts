import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Sinkronisasi otomatis:
// - Saat membership baru dibuat → tambahkan tenantId ke /users/{uid}.tenantIds.
// - Saat membership di-update (misal role/branchIds berubah) dan user sedang
//   memakai tenant ini sebagai tenant aktif → refresh custom claims-nya.
// - Saat membership dihapus / dinonaktifkan → revoke claims jika sedang aktif.
export const onMemberWritten = onDocumentWritten(
  {
    document: "tenants/{tid}/members/{uid}",
    region: "asia-southeast1",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const { tid, uid } = event.params;
    const userRef = getFirestore().doc(`users/${uid}`);

    if (after) {
      await userRef.set(
        {
          uid,
          tenantIds: FieldValue.arrayUnion(tid),
          email: after.email ?? before?.email ?? null,
          name: after.name ?? before?.name ?? null,
        },
        { merge: true },
      );

      let tokenInfo;
      try {
        tokenInfo = await getAuth().getUser(uid);
      } catch {
        return;
      }

      const claims = (tokenInfo.customClaims ?? {}) as {
        tenantId?: string;
        role?: string;
        branchIds?: string[];
      };

      if (claims.tenantId === tid) {
        if (after.status === "active") {
          await getAuth().setCustomUserClaims(uid, {
            tenantId: tid,
            role: after.role,
            branchIds: after.branchIds ?? ["*"],
          });
        } else {
          await getAuth().setCustomUserClaims(uid, null);
        }
      }
      return;
    }

    if (before && !after) {
      await userRef.set(
        { tenantIds: FieldValue.arrayRemove(tid) },
        { merge: true },
      );
      try {
        const tokenInfo = await getAuth().getUser(uid);
        const claims = (tokenInfo.customClaims ?? {}) as { tenantId?: string };
        if (claims.tenantId === tid) {
          await getAuth().setCustomUserClaims(uid, null);
        }
      } catch {
        /* ignore */
      }
    }
  },
);

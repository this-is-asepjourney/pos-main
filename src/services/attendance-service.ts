import {
  addDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  attendanceCol,
  attendanceDoc,
  DEFAULT_BRANCH_ID,
  isDemoTenant,
} from "@/lib/tenant";
import type { ShiftAttendance, TenantRole } from "@/types/pos";

export const subscribeActiveShifts = (
  tenantId: string,
  callback: (shifts: ShiftAttendance[]) => void,
): Unsubscribe => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    callback([]);
    return () => undefined;
  }

  const activeQuery = query(
    attendanceCol(tenantId),
    where("status", "==", "active"),
    limit(50),
  );
  return onSnapshot(
    activeQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as ShiftAttendance,
        ),
      );
    },
    (error) => {
      console.warn("Gagal memuat absensi aktif:", error.message);
      callback([]);
    },
  );
};

export const subscribeMyActiveShift = (
  tenantId: string,
  userId: string,
  callback: (shift: ShiftAttendance | null) => void,
): Unsubscribe => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId) || !userId) {
    callback(null);
    return () => undefined;
  }

  const myShiftQuery = query(
    attendanceCol(tenantId),
    where("userId", "==", userId),
    where("status", "==", "active"),
    limit(1),
  );

  return onSnapshot(
    myShiftQuery,
    (snapshot) => {
      const document = snapshot.docs[0];
      callback(
        document
          ? ({ id: document.id, ...document.data() } as ShiftAttendance)
          : null,
      );
    },
    (error) => {
      console.warn("Gagal memuat shift saya:", error.message);
      callback(null);
    },
  );
};

export const subscribeAttendanceHistory = (
  tenantId: string,
  callback: (shifts: ShiftAttendance[]) => void,
  maxItems = 100,
): Unsubscribe => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    callback([]);
    return () => undefined;
  }

  const historyQuery = query(
    attendanceCol(tenantId),
    orderBy("startedAt", "desc"),
    limit(maxItems),
  );
  return onSnapshot(
    historyQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as ShiftAttendance,
        ),
      );
    },
    (error) => {
      console.warn("Gagal memuat riwayat absensi:", error.message);
      callback([]);
    },
  );
};

export const startShift = async (
  tenantId: string,
  userId: string,
  userName: string,
  role: TenantRole,
  branchId: string = DEFAULT_BRANCH_ID,
) => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) return "demo-shift";

  const activeQuery = query(
    attendanceCol(tenantId),
    where("userId", "==", userId),
    where("status", "==", "active"),
    limit(1),
  );
  const activeSnapshot = await getDocs(activeQuery);

  if (!activeSnapshot.empty) {
    throw new Error("Shift kamu masih aktif. Akhiri shift sebelum mulai lagi.");
  }

  const shiftRef = await addDoc(attendanceCol(tenantId), {
    userId,
    userName,
    role,
    branchId,
    status: "active",
    startedAt: serverTimestamp(),
  });

  return shiftRef.id;
};

export const endShift = async (tenantId: string, shiftId: string) => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) return;

  await updateDoc(attendanceDoc(tenantId, shiftId), {
    status: "closed",
    endedAt: serverTimestamp(),
  });
};

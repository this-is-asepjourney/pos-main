import {
  addDoc,
  collection,
  doc,
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
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { ShiftAttendance, UserRole } from "@/types/pos";

const attendanceCollection = collection(db, "attendance");

export const subscribeActiveShifts = (
  callback: (shifts: ShiftAttendance[]) => void,
): Unsubscribe => {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => undefined;
  }

  const activeQuery = query(attendanceCollection, where("status", "==", "active"), limit(50));
  return onSnapshot(
    activeQuery,
    (snapshot) => {
      callback(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as ShiftAttendance));
    },
    (error) => {
      console.warn("Gagal memuat absensi aktif:", error.message);
      callback([]);
    },
  );
};

export const subscribeMyActiveShift = (
  userId: string,
  callback: (shift: ShiftAttendance | null) => void,
): Unsubscribe => {
  if (!isFirebaseConfigured || !userId) {
    callback(null);
    return () => undefined;
  }

  const myShiftQuery = query(
    attendanceCollection,
    where("userId", "==", userId),
    where("status", "==", "active"),
    limit(1),
  );

  return onSnapshot(
    myShiftQuery,
    (snapshot) => {
      const document = snapshot.docs[0];
      callback(document ? ({ id: document.id, ...document.data() } as ShiftAttendance) : null);
    },
    (error) => {
      console.warn("Gagal memuat shift saya:", error.message);
      callback(null);
    },
  );
};

export const subscribeAttendanceHistory = (
  callback: (shifts: ShiftAttendance[]) => void,
  maxItems = 100,
): Unsubscribe => {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => undefined;
  }

  const historyQuery = query(attendanceCollection, orderBy("startedAt", "desc"), limit(maxItems));
  return onSnapshot(
    historyQuery,
    (snapshot) => {
      callback(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as ShiftAttendance));
    },
    (error) => {
      console.warn("Gagal memuat riwayat absensi:", error.message);
      callback([]);
    },
  );
};

export const startShift = async (userId: string, userName: string, role: UserRole) => {
  if (!isFirebaseConfigured) return "demo-shift";

  const activeQuery = query(
    attendanceCollection,
    where("userId", "==", userId),
    where("status", "==", "active"),
    limit(1),
  );
  const activeSnapshot = await getDocs(activeQuery);

  if (!activeSnapshot.empty) {
    throw new Error("Shift kamu masih aktif. Akhiri shift sebelum mulai lagi.");
  }

  const shiftRef = await addDoc(attendanceCollection, {
    userId,
    userName,
    role,
    status: "active",
    startedAt: serverTimestamp(),
  });

  return shiftRef.id;
};

export const endShift = async (shiftId: string) => {
  if (!isFirebaseConfigured) return;

  await updateDoc(doc(db, "attendance", shiftId), {
    status: "closed",
    endedAt: serverTimestamp(),
  });
};

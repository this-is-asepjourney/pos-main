import type { ShiftAttendance, UserRole } from "@/types/pos";

export type Unsubscribe = () => void;

export const getActiveShifts = async (): Promise<ShiftAttendance[]> => {
  try {
    const res = await fetch("/api/attendance?status=active", { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

export const getAttendanceHistory = async (maxItems = 100): Promise<ShiftAttendance[]> => {
  try {
    const res = await fetch(`/api/attendance?limit=${maxItems}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

export const subscribeActiveShifts = (
  callback: (shifts: ShiftAttendance[]) => void
): Unsubscribe => {
  let active = true;

  const load = async () => {
    try {
      const data = await getActiveShifts();
      if (active) callback(data);
    } catch {
      if (active) callback([]);
    }
  };

  load();
  const intervalId = setInterval(load, 5000);

  return () => {
    active = false;
    clearInterval(intervalId);
  };
};

export const subscribeMyActiveShift = (
  userId: string,
  callback: (shift: ShiftAttendance | null) => void
): Unsubscribe => {
  let active = true;

  const load = async () => {
    if (!userId) {
      if (active) callback(null);
      return;
    }
    try {
      const res = await fetch(`/api/attendance?userId=${encodeURIComponent(userId)}&status=active&limit=1`, {
        cache: "no-store",
      });
      if (res.ok && active) {
        const shifts = await res.json();
        callback(shifts[0] || null);
      }
    } catch {
      if (active) callback(null);
    }
  };

  load();
  const intervalId = setInterval(load, 5000);

  return () => {
    active = false;
    clearInterval(intervalId);
  };
};

export const subscribeAttendanceHistory = (
  callback: (shifts: ShiftAttendance[]) => void,
  maxItems = 100
): Unsubscribe => {
  let active = true;

  const load = async () => {
    try {
      const data = await getAttendanceHistory(maxItems);
      if (active) callback(data);
    } catch {
      if (active) callback([]);
    }
  };

  load();
  const intervalId = setInterval(load, 5000);

  return () => {
    active = false;
    clearInterval(intervalId);
  };
};

export const startShift = async (userId: string, userName: string, role: UserRole) => {
  const res = await fetch("/api/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, userName, role }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Gagal memulai shift.");
  }

  const data = await res.json();
  if (data.alreadyActive) {
    throw new Error("Shift kamu masih aktif. Akhiri shift sebelum mulai lagi.");
  }

  return data.id;
};

export const endShift = async (shiftId: string) => {
  const res = await fetch("/api/attendance", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: shiftId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Gagal mengakhiri shift.");
  }
};

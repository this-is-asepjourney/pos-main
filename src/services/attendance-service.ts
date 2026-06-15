import type { ShiftAttendance, TenantRole } from "@/types/pos";

export const getActiveShifts = async (): Promise<ShiftAttendance[]> => {
  const response = await fetch("/api/attendance?status=active");
  if (!response.ok) throw new Error("Gagal memuat shift aktif.");
  return response.json();
};

export const getAttendanceHistory = async (maxItems = 100): Promise<ShiftAttendance[]> => {
  const response = await fetch(`/api/attendance?limit=${maxItems}`);
  if (!response.ok) throw new Error("Gagal memuat riwayat absensi.");
  return response.json();
};

export const startShift = async (
  userId: string,
  userName: string,
  role: TenantRole,
  branchId: string = "main",
): Promise<string> => {
  const response = await fetch("/api/attendance/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, userName, role, branchId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Gagal memulai shift.");
  }

  const data = await response.json();
  return data.id;
};

export const endShift = async (shiftId: string) => {
  const response = await fetch(`/api/attendance/${shiftId}/end`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Gagal mengakhiri shift.");
  }

  return response.json();
};

import type { DashboardStats } from "@/types/pos";

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await fetch("/api/dashboard");
  if (!response.ok) throw new Error("Gagal memuat dashboard stats.");
  return response.json();
};

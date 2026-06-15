import type { Member } from "@/types/pos";

export const listMembersForTenant = async (): Promise<Member[]> => {
  const response = await fetch("/api/tenants/members");
  if (!response.ok) throw new Error("Gagal memuat daftar anggota.");
  return response.json();
};

export const createTenantWithOwner = async (name: string): Promise<string> => {
  const response = await fetch("/api/tenants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Gagal membuat tenant.");
  }

  const data = await response.json();
  return data.tenantId;
};

export const inviteMemberToTenant = async (
  member: Omit<Member, "id" | "joinedAt"> & { uid: string },
) => {
  const response = await fetch("/api/tenants/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: member.uid,
      email: member.email,
      name: member.name,
      role: member.role,
      branchIds: member.branchIds,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Gagal mengundang anggota.");
  }

  return response.json();
};

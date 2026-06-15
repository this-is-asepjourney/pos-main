"use client";

import { useEffect, useState } from "react";
import { Store, User, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/app-provider";
import { createTenantWithOwner } from "@/services/tenant-service";
import { clsx } from "clsx";

export default function SelectTenantPage() {
  const { user, memberships, switchTenant, refreshMemberships, tenantId } = useAuth();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (tenantId && !showCreate) {
      router.push("/dashboard");
    }
  }, [tenantId, router, showCreate]);

  const handleSelect = async (id: string) => {
    setLoadingId(id);
    try {
      await switchTenant(id);
      router.push("/dashboard");
    } catch {
      setLoadingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const newTenantId = await createTenantWithOwner(newName);
      await refreshMemberships();
      await switchTenant(newTenantId);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl p-6 lg:p-10">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-black tracking-tight">Pilih Toko</h1>
          <p className="mt-2 text-slate-500">
            Anda terdaftar di beberapa toko. Pilih toko untuk melanjutkan.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {memberships.map((membership) => (
            <button
              key={membership.tenantId}
              type="button"
              onClick={() => handleSelect(membership.tenantId)}
              disabled={Boolean(loadingId)}
              className={clsx(
                "flex flex-col items-start rounded-3xl border bg-white p-6 text-left shadow-sm transition hover:border-cyan-300 hover:shadow-md disabled:opacity-50",
                membership.tenantId === tenantId ? "border-cyan-400 ring-2 ring-cyan-100" : "border-slate-200"
              )}
            >
              <div className="flex w-full items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                  <Store size={24} />
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {membership.role}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-bold">{membership.tenantName || membership.tenantId}</h2>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <User size={14} />
                {membership.branchIds.includes("*")
                  ? "Semua Cabang"
                  : `${membership.branchIds.length} Cabang`}
              </p>
              {loadingId === membership.tenantId ? (
                <p className="mt-4 text-sm font-semibold text-cyan-600">Membuka toko...</p>
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-10">
          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mx-auto flex items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 px-6 py-4 text-sm font-bold text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
            >
              <Plus size={18} />
              Buat Toko Baru
            </button>
          ) : (
            <form onSubmit={handleCreate} className="mx-auto max-w-sm rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold">Buat Toko Baru</h3>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nama Toko"
                className="mb-4 w-full rounded-2xl border bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-2xl bg-slate-100 py-3 font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 rounded-2xl bg-slate-950 py-3 font-bold text-white"
                >
                  {creating ? "Membuat..." : "Buat"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, LogOut, Plus } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useAuth } from "@/components/app-provider";
import { getTenant } from "@/services/tenant-service";

type TenantInfo = {
  tenantId: string;
  name: string;
  role: string;
};

export default function SelectTenantPage() {
  const router = useRouter();
  const { user, memberships, logout, switchTenant, loading, tenantId } = useAuth();
  const [items, setItems] = useState<TenantInfo[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all(
      memberships.map(async (m) => {
        const tenant = await getTenant(m.tenantId);
        return {
          tenantId: m.tenantId,
          name: tenant?.name ?? m.tenantId,
          role: m.role,
        };
      }),
    ).then((list) => {
      if (!cancelled) setItems(list);
    });
    return () => {
      cancelled = true;
    };
  }, [memberships, user]);

  const handlePick = async (next: string) => {
    setBusy(true);
    try {
      await switchTenant(next);
      router.replace("/dashboard");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">
        <p className="text-sm font-semibold">Memuat sesi...</p>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-2xl space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="flex items-center justify-between">
          <BrandMark textClassName="text-white" />
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/15"
          >
            <LogOut size={14} />
            Keluar
          </button>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Pilih toko</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Anda anggota di {items.length} toko
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Pilih salah satu untuk masuk. Toko yang sedang aktif ditandai khusus.
          </p>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
              Anda belum tergabung dalam toko apa pun.
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.tenantId}
                type="button"
                disabled={busy}
                onClick={() => handlePick(item.tenantId)}
                className="flex w-full items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-left transition hover:border-cyan-300/40 hover:bg-slate-900 disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-cyan-400/20 text-cyan-300">
                    <Building2 size={22} />
                  </span>
                  <div>
                    <p className="text-lg font-black">{item.name}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">
                      {item.role}
                      {tenantId === item.tenantId ? " • aktif" : ""}
                    </p>
                  </div>
                </div>
                <ArrowRight size={20} className="text-slate-400" />
              </button>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={() => router.push("/onboarding")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100"
        >
          <Plus size={16} />
          Buat toko baru
        </button>
      </div>
    </main>
  );
}

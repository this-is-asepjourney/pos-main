"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, LogOut, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useAuth } from "@/components/app-provider";
import { createTenantWithOwner } from "@/services/tenant-service";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, displayName, email, logout, refreshMemberships, switchTenant } = useAuth();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError("");

    try {
      const tenantId = await createTenantWithOwner({
        name: name.trim(),
        ownerUid: user.uid,
        ownerEmail: email,
        ownerName: displayName,
      });
      await refreshMemberships();
      await switchTenant(tenantId);
      router.replace("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal membuat toko.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-xl space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
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
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
            <Sparkles size={14} />
            Selamat datang
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Buat toko Anda</h1>
          <p className="mt-2 text-sm text-slate-300">
            Setiap toko memiliki produk, transaksi, dan tim sendiri. Anda akan menjadi
            <span className="font-bold text-white"> owner</span> dan otomatis mendapat 30 hari trial.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Nama toko
            </span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 px-4">
              <Building2 size={18} className="text-cyan-300" />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Kopi Mba Susi"
                className="w-full bg-transparent py-3 text-white outline-none"
                required
                minLength={3}
                maxLength={50}
              />
            </div>
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 transition hover:bg-cyan-300 disabled:bg-slate-600 disabled:text-slate-300"
          >
            {submitting ? "Menyiapkan toko..." : "Buat toko"}
          </button>
        </form>
      </div>
    </main>
  );
}

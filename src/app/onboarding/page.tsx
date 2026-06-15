"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Store, User, Mail, LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useAuth } from "@/components/app-provider";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshMemberships } = useAuth();
  
  const [tenantName, setTenantName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (user && !loading && !error) {
       // If user is already logged in, redirect to select-tenant or dashboard
       router.push("/select-tenant");
    }
  }, [user, authLoading, router, loading, error]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, tenantName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal membuat toko.");
      }
      await refreshMemberships();
      router.push("/dashboard");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Pembuatan toko gagal.");
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-4 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <BrandMark iconClassName="size-12 rounded-2xl" textClassName="text-slate-950" />
        </div>
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black tracking-tight">Buat Toko Baru</h2>
          <p className="mt-2 text-sm text-slate-500">
            Daftar akun dan siapkan toko pertama Anda
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Nama Toko</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-cyan-400">
              <Store size={18} className="text-slate-400" />
              <input
                value={tenantName}
                onChange={(event) => setTenantName(event.target.value)}
                placeholder="Kopi Asep"
                className="w-full bg-transparent py-3 font-semibold outline-none"
                required
                minLength={3}
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Nama Anda</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-cyan-400">
              <User size={18} className="text-slate-400" />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Asep Saepudin"
                className="w-full bg-transparent py-3 font-semibold outline-none"
                required
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Email</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-cyan-400">
              <Mail size={18} className="text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="asep@mail.com"
                className="w-full bg-transparent py-3 font-semibold outline-none"
                required
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Password</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-cyan-400">
              <LockKeyhole size={18} className="text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Min 6 karakter"
                className="w-full bg-transparent py-3 font-semibold outline-none"
                required
                minLength={6}
              />
            </div>
          </label>

          {error ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-cyan-600 px-5 py-4 font-black text-white transition hover:bg-cyan-700 disabled:bg-slate-300"
          >
            {loading ? "Memproses..." : "Daftar & Buat Toko"}
          </button>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-sm font-semibold text-slate-500 hover:text-slate-700"
            >
              Sudah punya akun? Masuk
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

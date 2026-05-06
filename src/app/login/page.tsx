"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useAuth } from "@/components/app-provider";

export default function LoginPage() {
  const router = useRouter();
  const { isConfigured, login, role, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConfigured || authLoading || !user) return;
    router.push(role === "admin" ? "/dashboard" : "/");
  }, [authLoading, isConfigured, role, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-slate-950 p-4 text-white lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500 via-green-700 to-slate-950 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute right-10 top-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="relative">
          <BrandMark iconClassName="size-16 rounded-3xl" textClassName="text-white" />
          <h1 className="mt-10 max-w-xl text-6xl font-black tracking-tight">
            Kelola penyewaan alat outdoor dalam satu layar.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-emerald-50">
            JIROLU Rental dirancang untuk operasional cepat: data alat real-time,
            perhitungan sewa + denda otomatis, dan laporan yang siap audit.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-4">
          {["Sewa outdoor", "Multi kasir", "Realtime"].map((item) => (
            <div key={item} className="rounded-3xl bg-white/15 p-5 backdrop-blur">
              <p className="text-sm font-bold">{item}</p>
              <p className="mt-2 text-xs text-emerald-50">JIROLU system</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-2 py-10 lg:px-12">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">JIROLU</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Masuk ke sistem</h2>
            <p className="mt-2 text-sm text-slate-500">
              {isConfigured
                ? "Gunakan akun Firebase Auth yang sudah dibuat."
                : "Firebase belum dikonfigurasi, tombol masuk akan membuka demo mode toko."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Email</span>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <Mail size={18} className="text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@pos.test"
                  className="w-full bg-transparent py-3 outline-none"
                  required={isConfigured}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Password</span>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <LockKeyhole size={18} className="text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="password"
                  className="w-full bg-transparent py-3 outline-none"
                  required={isConfigured}
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
              className="w-full rounded-2xl bg-slate-950 px-5 py-4 font-black text-white transition hover:bg-emerald-600 disabled:bg-slate-300"
            >
              {loading ? "Memeriksa..." : isConfigured ? "Masuk" : "Buka Demo"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

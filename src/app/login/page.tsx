"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, CreditCard, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useAuth } from "@/components/app-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login, role, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    router.push(role === "cashier" ? "/" : "/dashboard");
  }, [authLoading, role, router, user]);

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
      <section className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-br from-cyan-400 via-blue-500 to-slate-950 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute right-10 top-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="relative">
          <BrandMark iconClassName="size-16 rounded-3xl" textClassName="text-white" />
          <h1 className="mt-10 max-w-xl text-6xl font-black tracking-tight">
            Kelola kasir, stok, dan laporan dalam satu layar.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-cyan-50">
            Bro-POS dirancang untuk operasional cepat: real-time product sync,
            checkout rapi, dan dashboard yang mudah dibaca owner.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-4">
          {["MySQL", "Multi kasir", "Next.js"].map((item) => (
            <div key={item} className="rounded-3xl bg-white/15 p-5 backdrop-blur">
              <p className="text-sm font-bold">{item}</p>
              <p className="mt-2 text-xs text-cyan-50">Ready to scale</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-2 py-10 lg:px-12">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-700">Bro-POS</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Masuk ke sistem</h2>
            <p className="mt-2 text-sm text-slate-500">
              Silakan login dengan email dan password Anda.
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
                  required
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
                  required
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
              className="w-full rounded-2xl bg-slate-950 px-5 py-4 font-black text-white transition hover:bg-cyan-600 disabled:bg-slate-300"
            >
              {loading ? "Memeriksa..." : "Masuk"}
            </button>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => router.push("/onboarding")}
                className="text-sm font-semibold text-cyan-700 hover:text-cyan-600"
              >
                Belum punya akun? Buat Toko Baru
              </button>
            </div>
          </form>

          {/* Promotional Banner for Subscription Plans */}
          <div className="mt-8 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 text-center shadow-inner">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-sm">
              <Sparkles size={24} />
            </div>
            <h3 className="text-base font-black tracking-tight text-slate-900">
              Tertarik menggunakan Bro-POS?
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Lihat berbagai pilihan paket berlangganan yang dirancang khusus untuk skala bisnis Anda.
            </p>
            <button
              type="button"
              onClick={() => router.push("/pricing")}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/30"
            >
              <CreditCard size={18} />
              Lihat Harga & Paket
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  Clock3,
  CreditCard,
  LogOut,
  ReceiptText,
  ShoppingCart,
  ShieldCheck,
  Bell,
  MessageSquareWarning,
  X,
  Send,
  Loader2,
  LayoutDashboard,
  Calculator,
  Receipt,
  Package,
  Clock,
  Activity,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/components/app-provider";
import { BrandMark } from "@/components/brand-mark";
import { clsx } from "clsx";
import type { TenantRole } from "@/types/pos";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

const ALL_ROLES: TenantRole[] = ["owner", "admin", "cashier"];
const MANAGER_ROLES: TenantRole[] = ["owner", "admin"];

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["owner", "admin", "cashier"] },
  { label: "Kasir", href: "/", icon: Calculator, roles: ["owner", "admin", "cashier"] },
  { label: "Transaksi", href: "/transactions", icon: Receipt, roles: ["owner", "admin"] },
  { label: "Produk", href: "/products", icon: Package, roles: ["owner", "admin"] },
  { label: "Shift", href: "/attendance", icon: Clock, roles: ["owner", "admin", "cashier"] },
  { label: "Diskon", href: "/discounts", icon: Sparkles, roles: ["owner", "admin"] },
  { label: "Pengaturan", href: "/settings", icon: Building2, roles: ["owner", "admin"] },
  { label: "Log Aktivitas", href: "/activity-logs", icon: Activity, roles: ["owner", "admin"] },
  { label: "Langganan", href: "/subscription", icon: CreditCard, roles: ["owner"] },
];


export function Navbar() {
  const pathname = usePathname();
  const {
    user,
    displayName,
    logout,
    role,
    tenantId,
    memberships,
    isSuperAdmin,
  } = useAuth();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifModal, setShowNotifModal] = useState(false);
  
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId })
      })
      .then(r => r.json())
      .then(data => {
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.notifications.length);
        }
      })
      .catch(console.error);
    }
  }, [tenantId]);

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenantId) return;
    setSendingFeedback(true);
    try {
      const res = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, userId: user.uid, subject: feedbackSubject, message: feedbackMessage })
      });
      if (res.ok) {
        alert("Laporan/Feedback berhasil dikirim. Terima kasih!");
        setShowFeedbackModal(false);
        setFeedbackSubject("");
        setFeedbackMessage("");
      } else {
        const d = await res.json();
        alert("Gagal: " + d.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const activeMembership = memberships.find((m) => m.tenantId === tenantId);

  return (
    <>
      <aside className="flex w-full flex-col gap-6 border-b border-white/10 bg-slate-950 px-4 py-4 text-white lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5">
        <div className="flex items-center justify-between lg:block">
          <Link href="/" aria-label="Bro-POS home">
            <BrandMark textClassName="text-white" />
          </Link>
          <div className="flex items-center gap-3 lg:hidden">
            <div className="text-right">
              <p className="text-xs font-semibold">{displayName}</p>
              <p className="text-[9px] uppercase tracking-[0.16em] text-cyan-300">{role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-white/10 p-2 text-slate-200 transition hover:bg-white/20"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {tenantId ? (
        <Link
          href="/select-tenant"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-bold text-white transition hover:bg-white/10"
        >
          <Building2 size={18} className="text-cyan-300" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Toko aktif
            </p>
            <p className="truncate font-black text-white">
              {activeMembership?.tenantName ?? tenantId}
            </p>
          </div>
        </Link>
      ) : null}

      <nav className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 lg:flex-col lg:overflow-visible [&::-webkit-scrollbar]:hidden scroll-smooth">
        {navItems
          .filter((item) => item.roles.includes(role))
          .map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-white text-slate-950 shadow-lg shadow-black/20"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        {isSuperAdmin ? (
          <div className="flex shrink-0 lg:mt-4 lg:block lg:border-t lg:border-white/10 lg:pt-4">
            <Link
              href="/admin"
              className="flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-emerald-400 hover:bg-white/10 transition"
            >
              <ShieldCheck size={18} />
              Admin Panel
            </Link>
          </div>
        ) : null}
        
        <div className="flex shrink-0 gap-2 lg:mt-4 lg:block lg:space-y-2 lg:border-t lg:border-white/10 lg:pt-4">
          <button
            onClick={() => {
              setShowNotifModal(true);
              setUnreadCount(0);
            }}
            className="flex min-w-max items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <div className="flex items-center gap-3">
              <Bell size={18} />
              Notifikasi
            </div>
            {unreadCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">
                {unreadCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <MessageSquareWarning size={18} />
            Bantuan & Laporan
          </button>
        </div>
      </nav>



      <div className="mt-auto hidden rounded-3xl border border-white/10 bg-white/5 p-4 lg:block">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Operator</p>
        <p className="mt-2 font-semibold">{displayName}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-cyan-300">{role}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/15"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </aside>

      {/* Notifications Modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm">
          <div className="w-full max-w-sm h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 text-slate-900">
              <div className="flex items-center gap-2 font-black text-lg">
                <Bell size={20} className="text-indigo-500" />
                Notifikasi
              </div>
              <button onClick={() => setShowNotifModal(false)} className="rounded-xl p-2 hover:bg-slate-200 transition">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={clsx("inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase", 
                      n.type === 'promo' ? 'bg-amber-100 text-amber-700' :
                      n.type === 'warning' ? 'bg-rose-100 text-rose-700' :
                      'bg-sky-100 text-sky-700')}>
                      {n.type}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{formatDateTime(n.created_at)}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">{n.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{n.message}</p>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm font-medium">Belum ada notifikasi.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <MessageSquareWarning size={20} className="text-rose-500" />
                Laporan & Masukan
              </h2>
              <button onClick={() => setShowFeedbackModal(false)} className="rounded-xl p-2 hover:bg-slate-100 transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSendFeedback} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Subjek</label>
                <input required type="text" value={feedbackSubject} onChange={e => setFeedbackSubject(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2" placeholder="Contoh: Bug pada halaman kasir" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Pesan / Detail</label>
                <textarea required rows={5} value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 resize-none" placeholder="Ceritakan detail kendala atau masukan Anda..." />
              </div>
              <div className="pt-4">
                <button type="submit" disabled={sendingFeedback} className="w-full rounded-xl bg-slate-900 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-50 flex justify-center items-center gap-2 transition">
                  {sendingFeedback ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Kirim Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserRole } from "@/types/pos";

export type SessionUser = {
  uid: string;
  id: string;
  displayName: string;
  email: string;
};

type AuthContextValue = {
  user: SessionUser | null;
  displayName: string;
  role: UserRole;
  isConfigured: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<UserRole>("admin");
  const [loading, setLoading] = useState(true);
  const isConfigured = true;

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user && active) {
            setUser({
              uid: data.user.id,
              id: data.user.id,
              displayName: data.user.name || data.user.email,
              email: data.user.email,
            });
            setRole(data.user.role === "admin" ? "admin" : "cashier");
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("[Auth Provider] Session check note:", err);
      }

      // Check saved localStorage fallback for quick cashier access
      try {
        const cached = localStorage.getItem("pos_user");
        if (cached && active) {
          const parsed = JSON.parse(cached);
          setUser(parsed);
          setRole(parsed.role === "admin" ? "admin" : "cashier");
        }
      } catch {
        // Ignore JSON error
      }

      if (active) setLoading(false);
    };

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || "Gagal masuk. Periksa email dan password.");
    }

    const data = await res.json();
    const sessionUser: SessionUser = {
      uid: data.user.id,
      id: data.user.id,
      displayName: data.user.name || data.user.email,
      email: data.user.email,
    };

    setUser(sessionUser);
    setRole(data.user.role === "admin" ? "admin" : "cashier");

    try {
      localStorage.setItem(
        "pos_user",
        JSON.stringify({ ...sessionUser, role: data.user.role })
      );
    } catch {
      // Ignore storage error
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    setUser(null);
    setRole("cashier");
    try {
      localStorage.removeItem("pos_user");
    } catch {
      // Ignore
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      displayName: user?.displayName ?? user?.email ?? "Kasir",
      role,
      isConfigured,
      loading,
      login,
      logout,
    }),
    [loading, role, user, isConfigured]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AppProvider.");
  }
  return context;
};

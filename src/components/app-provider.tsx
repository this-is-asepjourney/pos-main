"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import type { UserRole } from "@/types/pos";

type AuthContextValue = {
  user: User | null;
  displayName: string;
  role: UserRole;
  isConfigured: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Firebase auth timeout.")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [role, setRole] = useState<UserRole>("admin");

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return undefined;
    }

    let authResolved = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!authResolved) {
        setUser(null);
        setRole("cashier");
        setLoading(false);
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        authResolved = true;
        window.clearTimeout(fallbackTimer);
        setUser(currentUser);

        if (!currentUser) {
          setRole("cashier");
          setLoading(false);
          return;
        }

        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnapshot = await withTimeout(getDoc(userRef), 4000);

          if (!userSnapshot.exists()) {
            // New accounts default to cashier; admin can promote from Firestore.
            await withTimeout(
              setDoc(userRef, {
                name: currentUser.displayName ?? currentUser.email ?? "User",
                email: currentUser.email ?? "",
                role: "cashier",
                createdAt: serverTimestamp(),
              }),
              4000,
            );
            setRole("cashier");
          } else {
            const userData = userSnapshot.data();
            setRole(userData.role === "admin" ? "admin" : "cashier");
          }
        } catch {
          setRole("cashier");
        } finally {
          setLoading(false);
        }
      },
      () => {
        authResolved = true;
        window.clearTimeout(fallbackTimer);
        setUser(null);
        setRole("cashier");
        setLoading(false);
      },
    );

    return () => {
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      displayName: user?.displayName ?? user?.email ?? "Admin Demo",
      role,
      isConfigured: isFirebaseConfigured,
      loading,
      login: async (email, password) => {
        if (!isFirebaseConfigured) return;
        await signInWithEmailAndPassword(auth, email, password);
      },
      logout: async () => {
        if (!isFirebaseConfigured) return;
        await signOut(auth);
      },
    }),
    [loading, role, user],
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

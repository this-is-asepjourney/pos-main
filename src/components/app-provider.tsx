"use client";

import {
  createContext,
  useCallback,
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
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { DEFAULT_BRANCH_ID, DEMO_TENANT_ID } from "@/lib/tenant";
import {
  ensureGlobalUser,
  findMembershipsByEmail,
  getMember,
  setDefaultTenant,
} from "@/services/tenant-service";
import type { TenantRole } from "@/types/pos";

type TenantClaim = {
  tenantId: string | null;
  role: TenantRole;
  branchIds: string[];
};

export type Membership = {
  tenantId: string;
  tenantName?: string;
  role: TenantRole;
  branchIds: string[];
};

type AuthContextValue = {
  user: User | null;
  displayName: string;
  email: string;
  tenantId: string | null;
  role: TenantRole;
  branchIds: string[];
  branchActive: string;
  memberships: Membership[];
  isConfigured: boolean;
  loading: boolean;
  needsTenantSelection: boolean;
  needsOnboarding: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshMemberships: () => Promise<void>;
  setBranchActive: (branchId: string) => void;
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

const readClaims = async (user: User): Promise<TenantClaim> => {
  const tokenResult = await user.getIdTokenResult();
  const claims = tokenResult.claims as {
    tenantId?: string;
    role?: TenantRole;
    branchIds?: string[];
  };
  return {
    tenantId: claims.tenantId ?? null,
    role: (claims.role as TenantRole) ?? "cashier",
    branchIds: Array.isArray(claims.branchIds) && claims.branchIds.length
      ? claims.branchIds
      : ["*"],
  };
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [tenantId, setTenantId] = useState<string | null>(
    isFirebaseConfigured ? null : DEMO_TENANT_ID,
  );
  const [role, setRole] = useState<TenantRole>(
    isFirebaseConfigured ? "cashier" : "admin",
  );
  const [branchIds, setBranchIds] = useState<string[]>(
    isFirebaseConfigured ? [] : ["*"],
  );
  const [branchActive, setBranchActive] = useState<string>(DEFAULT_BRANCH_ID);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const resolveMemberships = useCallback(
    async (currentUser: User): Promise<Membership[]> => {
      if (!isFirebaseConfigured || !currentUser.email) return [];
      try {
        const results = await findMembershipsByEmail(currentUser.email);
        return results.map((entry) => ({
          tenantId: entry.tenantId,
          role: entry.member.role,
          branchIds: entry.member.branchIds,
        }));
      } catch (error) {
        console.warn("Gagal memuat keanggotaan tenant:", error);
        return [];
      }
    },
    [],
  );

  const applyMembership = useCallback((tid: string, member: { role: TenantRole; branchIds: string[] }) => {
    setTenantId(tid);
    setRole(member.role);
    setBranchIds(member.branchIds);
    const firstBranch = member.branchIds.find((b) => b && b !== "*") ?? DEFAULT_BRANCH_ID;
    setBranchActive(firstBranch);
  }, []);

  const initializeForUser = useCallback(
    async (currentUser: User) => {
      await ensureGlobalUser(
        currentUser.uid,
        currentUser.email ?? "",
        currentUser.displayName ?? currentUser.email ?? "User",
      );

      const claims = await readClaims(currentUser);
      const list = await resolveMemberships(currentUser);
      setMemberships(list);

      if (claims.tenantId && list.some((m) => m.tenantId === claims.tenantId)) {
        applyMembership(claims.tenantId, { role: claims.role, branchIds: claims.branchIds });
        setNeedsOnboarding(false);
        return;
      }

      if (list.length === 0) {
        setTenantId(null);
        setRole("cashier");
        setBranchIds([]);
        setNeedsOnboarding(true);
        return;
      }

      const target = list[0];
      // Tanpa Cloud Function setActiveTenant, kita tetap bisa pakai membership doc
      // untuk menentukan tenant aktif. Rules akan menerima request kalau sudah punya
      // claims yang sesuai (deploy CF) ATAU memakai fallback membership lookup.
      const member = await getMember(target.tenantId, currentUser.uid);
      if (member) {
        applyMembership(target.tenantId, member);
        await setDefaultTenant(currentUser.uid, target.tenantId);
      }
      setNeedsOnboarding(false);
    },
    [applyMembership, resolveMemberships],
  );

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return undefined;
    }

    let authResolved = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!authResolved) {
        setUser(null);
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        authResolved = true;
        window.clearTimeout(fallbackTimer);
        setUser(currentUser);

        if (!currentUser) {
          setTenantId(null);
          setRole("cashier");
          setBranchIds([]);
          setMemberships([]);
          setNeedsOnboarding(false);
          setLoading(false);
          return;
        }

        try {
          await withTimeout(initializeForUser(currentUser), 8000);
        } catch (error) {
          console.warn("Inisialisasi sesi gagal:", error);
        } finally {
          setLoading(false);
        }
      },
      () => {
        authResolved = true;
        window.clearTimeout(fallbackTimer);
        setUser(null);
        setLoading(false);
      },
    );

    return () => {
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [initializeForUser]);

  const switchTenant = useCallback(
    async (nextTenantId: string) => {
      if (!user) return;
      const target = memberships.find((m) => m.tenantId === nextTenantId);
      if (!target) {
        const member = await getMember(nextTenantId, user.uid);
        if (!member) throw new Error("Anda bukan anggota tenant ini.");
        applyMembership(nextTenantId, member);
      } else {
        applyMembership(nextTenantId, target);
      }
      await setDefaultTenant(user.uid, nextTenantId);
      try {
        await user.getIdToken(true);
        const claims = await readClaims(user);
        if (claims.tenantId === nextTenantId) {
          setRole(claims.role);
          setBranchIds(claims.branchIds);
        }
      } catch {
        /* token refresh boleh gagal — UI tetap memakai data membership */
      }
      setNeedsOnboarding(false);
    },
    [applyMembership, memberships, user],
  );

  const refreshMemberships = useCallback(async () => {
    if (!user) return;
    const list = await resolveMemberships(user);
    setMemberships(list);
  }, [resolveMemberships, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      displayName: user?.displayName ?? user?.email ?? "Admin Demo",
      email: user?.email ?? "",
      tenantId,
      role,
      branchIds,
      branchActive,
      memberships,
      isConfigured: isFirebaseConfigured,
      loading,
      needsTenantSelection: Boolean(user) && memberships.length > 1 && !tenantId,
      needsOnboarding,
      login: async (email, password) => {
        if (!isFirebaseConfigured) return;
        await signInWithEmailAndPassword(auth, email, password);
      },
      logout: async () => {
        if (!isFirebaseConfigured) return;
        await signOut(auth);
      },
      switchTenant,
      refreshMemberships,
      setBranchActive,
    }),
    [
      branchActive,
      branchIds,
      loading,
      memberships,
      needsOnboarding,
      refreshMemberships,
      role,
      switchTenant,
      tenantId,
      user,
    ],
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

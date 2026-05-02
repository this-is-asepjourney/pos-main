import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  branchDoc,
  DEFAULT_BRANCH_ID,
  isDemoTenant,
  memberDoc,
  membersCol,
  slugify,
  tenantDoc,
} from "@/lib/tenant";
import type { Member, Tenant } from "@/types/pos";

const userDoc = (uid: string): DocumentReference => doc(db, "users", uid);
const subscriptionDoc = (tid: string): DocumentReference =>
  doc(db, "subscriptions", tid);

export type CreateTenantInput = {
  name: string;
  ownerUid: string;
  ownerEmail: string;
  ownerName: string;
};

export const getTenant = async (tenantId: string): Promise<Tenant | null> => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) return null;
  const snap = await getDoc(tenantDoc(tenantId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Tenant, "id">) };
};

export const getMember = async (
  tenantId: string,
  uid: string,
): Promise<Member | null> => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) return null;
  const snap = await getDoc(memberDoc(tenantId, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Member, "id">) };
};

export const listMembersForTenant = async (tenantId: string): Promise<Member[]> => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) return [];
  const snap = await getDocs(membersCol(tenantId));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Member, "id">) }));
};

export const findMembershipsByEmail = async (
  email: string,
): Promise<{ tenantId: string; member: Member }[]> => {
  if (!isFirebaseConfigured) return [];
  const memberQuery = query(
    collectionGroup(db, "members"),
    where("email", "==", email),
    where("status", "==", "active"),
  );
  const snap = await getDocs(memberQuery);
  return snap.docs.map((d) => {
    const tenantId = d.ref.parent.parent?.id ?? "";
    return {
      tenantId,
      member: { id: d.id, ...(d.data() as Omit<Member, "id">) },
    };
  });
};

export const ensureGlobalUser = async (
  uid: string,
  email: string,
  name: string,
) => {
  if (!isFirebaseConfigured) return;
  const ref = userDoc(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    await setDoc(
      ref,
      {
        uid,
        email,
        name: data.name ?? name,
      },
      { merge: true },
    );
  } else {
    await setDoc(ref, {
      uid,
      email,
      name,
      defaultTenantId: null,
      tenantIds: [],
      createdAt: serverTimestamp(),
    });
  }
};

export const setDefaultTenant = async (uid: string, tenantId: string) => {
  if (!isFirebaseConfigured) return;
  await setDoc(
    userDoc(uid),
    { defaultTenantId: tenantId, updatedAt: serverTimestamp() },
    { merge: true },
  );
};

export const createTenantWithOwner = async (input: CreateTenantInput) => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi.");
  }

  const baseSlug = slugify(input.name);
  const tenantId = `${baseSlug}-${Date.now().toString(36)}`;
  const trialDays = 30;
  const now = new Date();
  const trialEnd = new Date(now.getTime() + trialDays * 86400000);

  const batch = writeBatch(db);

  batch.set(tenantDoc(tenantId), {
    name: input.name,
    slug: baseSlug,
    ownerUid: input.ownerUid,
    status: "trial",
    plan: "free",
    branchCount: 1,
    settings: {
      currency: "IDR",
      taxRate: 0,
      timezone: "Asia/Jakarta",
      receiptFooter: `Terima kasih, ${input.name}.`,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(branchDoc(tenantId, DEFAULT_BRANCH_ID), {
    name: "Cabang Utama",
    address: "",
    isActive: true,
    createdAt: serverTimestamp(),
  });

  batch.set(memberDoc(tenantId, input.ownerUid), {
    uid: input.ownerUid,
    email: input.ownerEmail,
    name: input.ownerName,
    role: "owner",
    branchIds: ["*"],
    status: "active",
    joinedAt: serverTimestamp(),
  });

  batch.set(subscriptionDoc(tenantId), {
    tenantId,
    planId: "free",
    status: "trial",
    trialEndsAt: Timestamp.fromDate(trialEnd),
    currentPeriodStart: serverTimestamp(),
    currentPeriodEnd: Timestamp.fromDate(trialEnd),
  });

  batch.set(
    userDoc(input.ownerUid),
    {
      uid: input.ownerUid,
      email: input.ownerEmail,
      name: input.ownerName,
      defaultTenantId: tenantId,
      tenantIds: [tenantId],
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
  return tenantId;
};

export const inviteMemberToTenant = async (
  tenantId: string,
  member: Omit<Member, "id" | "joinedAt"> & { uid: string },
) => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    throw new Error("Tidak bisa mengundang member di demo mode.");
  }
  await setDoc(memberDoc(tenantId, member.uid), {
    ...member,
    joinedAt: serverTimestamp(),
  });
};

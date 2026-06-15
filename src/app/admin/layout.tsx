import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel | Bro-POS",
  description: "Super admin panel for managing tenants, users, and plans.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

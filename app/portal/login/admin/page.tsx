import type { Metadata } from "next";
import LoginPanel from "@/components/portal/LoginPanel";

export const metadata: Metadata = { title: "Admin login" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginPanel audience="admin" error={error} />;
}

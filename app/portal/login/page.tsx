import type { Metadata } from "next";
import LoginPanel from "@/components/portal/LoginPanel";

export const metadata: Metadata = { title: "Client login" };

export default async function ClientLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginPanel audience="client" error={error} />;
}

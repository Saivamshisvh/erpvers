import type { Metadata } from "next";
import LoginPanel from "@/components/portal/LoginPanel";

export const metadata: Metadata = { title: "Employee login" };

export default async function EmployeeLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginPanel audience="employee" error={error} />;
}

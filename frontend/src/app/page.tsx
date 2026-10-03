"use client";

import AuthForm from "@/components/AuthForm";
import Dashboard from "@/components/Dashboard";
import { useSession } from "@/lib/session";

export default function Home() {
  const { loading, session } = useSession();
  if (loading) return null;
  if (!session) return <AuthForm />;
  return <Dashboard key={session.token} email={session.email} />;
}

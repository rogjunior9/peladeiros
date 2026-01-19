"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// Redirect to players page - users management is done there
export default function UsersPage() {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    } else {
      router.push("/players");
    }
  }, [session, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-green-600">Redirecionando...</div>
    </div>
  );
}

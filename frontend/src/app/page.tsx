"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { state } = useAuth();

  useEffect(() => {
    if (!state.accountToken) {
      router.replace("/login");
      return;
    }
    if (!state.tenantToken) {
      router.replace("/tenants");
      return;
    }
    router.replace("/app");
  }, [router, state.accountToken, state.tenantToken]);

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 text-zinc-700">
      Loading…
    </div>
  );
}

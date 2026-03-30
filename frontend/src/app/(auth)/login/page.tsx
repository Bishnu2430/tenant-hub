"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, clearError, state } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (state.accountToken) {
    router.replace("/tenants");
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your tenants"
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          clearError();
          await login(email.trim(), password);
          router.replace("/tenants");
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>

        <div className="text-sm text-zinc-600">
          New here?{" "}
          <Link
            className="font-medium text-emerald-700 hover:text-emerald-800"
            href="/register"
          >
            Create an account
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error, clearError } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthShell
      title="Create your account"
      subtitle="You can create a tenant after signing in"
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          clearError();
          await register(email.trim(), password, fullName.trim() || undefined);
          router.replace(`/login?email=${encodeURIComponent(email.trim())}`);
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="fullName">Full name (optional)</Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
          />
        </div>

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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <p className="text-xs text-zinc-500">Minimum 8 characters.</p>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>

        <div className="text-sm text-zinc-600">
          Already have an account?{" "}
          <Link
            className="font-medium text-emerald-700 hover:text-emerald-800"
            href="/login"
          >
            Sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

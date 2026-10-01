"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <p className="font-display text-4xl text-oasis-700 tracking-tight">
          NidahAI
        </p>
        <p className="mt-2 text-sand-800/80 text-sm">
          Staff sign-in for appointment confirmation
        </p>
        <form onSubmit={onSubmit} className="mt-10 space-y-4">
          <label className="block text-sm">
            <span className="text-sand-800/70">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sand-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-oasis-500"
            />
          </label>
          <label className="block text-sm">
            <span className="text-sand-800/70">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sand-200 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-oasis-500"
            />
          </label>
          {error && (
            <p className="text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-oasis-600 hover:bg-oasis-700 text-white py-2.5 font-medium transition disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (signInRes?.error) {
      setError("Account created but sign-in failed. Try logging in.");
      setLoading(false);
    } else {
      window.location.href = "/";
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-ink mb-2">
        Create Account
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        Sign up to start building your wardrobe
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && (
          <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg py-2">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-transparent"
          />
          <p className="text-xs text-stone-400 mt-1">At least 6 characters</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-sm text-stone-500">
        Already have an account?{" "}
        <Link href="/login" className="text-stone-800 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

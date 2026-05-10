"use client";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientAuth } from "@/lib/firebase/firebaseClient";
import { cn } from "@/lib/utils";

export function LoginForm({ className, ...props }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const _router = useRouter();

  useEffect(() => {
    const cleanup = async () => {
      try {
        await new Promise((resolve) => {
          const unsubscribe = clientAuth.onAuthStateChanged(() => {
            unsubscribe();
            resolve();
          });
        });
        if (clientAuth.currentUser) {
          await signOut(clientAuth);
        }
      } catch (err) {
        console.log("Client auth cleanup:", err.message);
      }
    };
    cleanup();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (clientAuth.currentUser) {
        await signOut(clientAuth);
      }

      const userCred = await signInWithEmailAndPassword(
        clientAuth,
        email,
        password,
      );
      const idToken = await userCred.user.getIdToken();

      const res = await fetch("/api/auth/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Session creation failed");
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.message.includes("auth/")
          ? "Email o password non validi"
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-5", className)} {...props}>
      <form onSubmit={handleLogin} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="operatore@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 text-base"
            autoComplete="email"
            inputMode="email"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Password dimenticata?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 text-base"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="h-12 w-full text-base font-medium"
          disabled={loading}
        >
          {loading ? "Accesso in corso…" : "Accedi"}
        </Button>
      </form>
    </div>
  );
}

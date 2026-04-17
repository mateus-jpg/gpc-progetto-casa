"use client";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientAuth } from "@/lib/firebase/firebaseClient"; // your Firebase client SDK init
import { cn } from "@/lib/utils";

export function LoginForm({ className, ...props }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Clean up any existing Firebase auth state on mount
  useEffect(() => {
    const cleanup = async () => {
      try {
        // Wait for auth to initialize
        await new Promise((resolve) => {
          const unsubscribe = clientAuth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve();
          });
        });

        if (clientAuth.currentUser) {
          console.log("Cleaning up existing auth state");
          await signOut(clientAuth);
        }
      } catch (error) {
        console.log("Client auth cleanup:", error.message);
      }
    };
    cleanup();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Sign out any existing user first (cleanup)
      if (clientAuth.currentUser) {
        await signOut(clientAuth);
      }

      // 2. Sign in with Firebase
      const userCred = await signInWithEmailAndPassword(
        clientAuth,
        email,
        password,
      );
      const idToken = await userCred.user.getIdToken();

      // 3. Exchange ID token for a session cookie
      const res = await fetch("/api/auth/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include", // Ensure cookies are included
      });

      console.log("Session login response:", res);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Session creation failed");
      }

      console.log("✓ Session cookie created");

      // 4. Small delay to ensure cookie is properly set before redirect
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 5. Use window.location instead of router.push for hard navigation
      // This ensures the middleware runs with the fresh cookie
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.message.includes("auth/")
          ? "Invalid email or password"
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">GPC - Login</CardTitle>
          <CardDescription>
            Inserisci mail e password per accedere al portale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Hai dimenticato la password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

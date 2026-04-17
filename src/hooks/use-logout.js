// hooks/useLogout.js
"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { clientAuth } from "@/lib/firebase/firebaseClient";
import { clearSwrCache } from "@/lib/swr-config";

// Auth cache key (must match AuthContext.js)
const AUTH_CACHE_KEY = "gpc_auth_cache";

/**
 * Clear auth data from localStorage cache
 */
function clearCachedAuthData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_CACHE_KEY);
}

export function useLogout() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { mutate } = useSWRConfig();

  const logout = async () => {
    if (isLoggingOut) return; // Prevent multiple simultaneous logout attempts

    setIsLoggingOut(true);

    try {
      console.log("Starting logout process...");

      // 1. Clear all client-side caches first
      clearCachedAuthData();
      await clearSwrCache(mutate);
      console.log("✓ Client caches cleared");

      // 2. Sign out from Firebase client
      if (clientAuth.currentUser) {
        await signOut(clientAuth);
        console.log("✓ Firebase client logout successful");
      }

      // 3. Call server logout to clear session cookie
      const response = await fetch("/api/auth/sessionLogout", {
        method: "POST",
        credentials: "same-origin", // Ensure cookies are sent
      });

      if (response.ok) {
        console.log("✓ Server logout successful");
      } else {
        console.warn("⚠ Server logout failed, but continuing...");
      }

      // 4. Navigate to login page
      console.log("✓ Redirecting to login...");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);

      // Even if there's an error, try to navigate to login
      // This ensures user isn't stuck in a bad state
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
}

// Usage in your component:
// import { useLogout } from "@/hooks/useLogout";
//
// const { logout, isLoggingOut } = useLogout();
//
// <DropdownMenuItem onClick={logout} disabled={isLoggingOut}>
//   <IconLogout />
//   {isLoggingOut ? "Logging out..." : "Log out"}
// </DropdownMenuItem>

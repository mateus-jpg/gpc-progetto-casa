"use client";
import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSWRConfig } from "swr";
import { clientAuth as auth } from "@/lib/firebase/firebaseClient";
import { clearSwrCache } from "@/lib/swr-config";

// const db = getFirestore(); // db is valid but not used directly anymore

const AuthContext = createContext(undefined);

// Cache configuration
const AUTH_CACHE_KEY = "gpc_auth_cache";
const AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Request deduplication - stores in-flight promises
let pendingFetchPromise = null;

/**
 * Get cached auth data from localStorage
 * @returns {Object|null} Cached user data or null if expired/missing
 */
function getCachedAuthData() {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return null;

    const { data, expiresAt } = JSON.parse(cached);

    // Check if cache has expired
    if (Date.now() > expiresAt) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error reading auth cache:", error);
    localStorage.removeItem(AUTH_CACHE_KEY);
    return null;
  }
}

/**
 * Store auth data in localStorage cache
 * @param {Object} data - The auth data to cache
 */
function setCachedAuthData(data) {
  if (typeof window === "undefined") return;

  try {
    const cacheEntry = {
      data,
      expiresAt: Date.now() + AUTH_CACHE_TTL,
    };
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error("Error writing auth cache:", error);
  }
}

/**
 * Clear auth data from localStorage cache
 */
function clearCachedAuthData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_CACHE_KEY);
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableStructures, setAvailableStructures] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [currentStructure, setCurrentStructure] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const { mutate } = useSWRConfig();

  // Import the server action dynamically to avoid build time issues if needed,
  // or just import at top level. Since we are inside a client component,
  // we should import it at the top level, but for this refactor I'll add the import
  // to the replacement chunk or assume it's imported.
  // actually, let's use the replacement to add the import too.

  // Fetch user data using Server Action
  const fetchUserData = useCallback(async (skipCache = false) => {
    // Check cache first
    if (!skipCache) {
      const cachedData = getCachedAuthData();
      if (cachedData) {
        console.log("Using cached auth data");
        setAvailableStructures(cachedData.structures || []);
        setAvailableProjects(cachedData.projects || []);
        return cachedData.user;
      }
    }

    if (pendingFetchPromise) {
      return pendingFetchPromise;
    }

    const fetchOperation = async () => {
      try {
        // Dynamically import to ensure it works in Client Component
        const { getAuthUserData } = await import("@/actions/auth/getUserData");

        const result = await getAuthUserData();

        if (!result.success) {
          console.error("Failed to fetch user data:", result.error);
          return null;
        }

        const { user: fullUser, structures, projects } = result;

        // Get email from client auth if missing (Server Action uses Firestore data which might not have email depending on sync)
        if (auth.currentUser && !fullUser.email) {
          fullUser.email = auth.currentUser.email;
        }

        console.log("Fetched full user via Server Action:", fullUser);

        setAvailableStructures(structures);
        setAvailableProjects(projects);

        setCachedAuthData({
          user: fullUser,
          structures,
          projects,
        });

        return fullUser;
      } catch (err) {
        console.error("Failed to fetch user data", err);
        return null;
      } finally {
        pendingFetchPromise = null;
      }
    };

    pendingFetchPromise = fetchOperation();
    return pendingFetchPromise;
  }, []);

  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      // Wait for Firebase Auth to initialize
      await auth.authStateReady();

      if (auth.currentUser) {
        const fullUser = await fetchUserData();
        if (mounted) setUser(fullUser);
      } else {
        console.log("No authenticated user found on init");
      }
      if (mounted) setLoading(false);
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [fetchUserData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setAvailableStructures([]);
        setAvailableProjects([]);
      }
    });
    return unsubscribe;
  }, []);

  const signInWithEmail = useCallback(
    async (email, password) => {
      setLoading(true);
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        // Create session cookie
        const idToken = await cred.user.getIdToken();
        const res = await fetch("/api/auth/sessionLogin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (!res.ok) throw new Error("Failed to create session cookie");

        clearCachedAuthData();
        await clearSwrCache(mutate);

        const fullUser = await fetchUserData(true);
        setUser(fullUser);
      } finally {
        setLoading(false);
      }
    },
    [fetchUserData, mutate],
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/sessionLogout", { method: "POST" });
      await firebaseSignOut(auth);
      clearCachedAuthData();
      await clearSwrCache(mutate);
      setUser(null);
      setAvailableStructures([]);
      setAvailableProjects([]);
    } finally {
      setLoading(false);
    }
  }, [mutate]);

  const refreshAuthData = useCallback(async () => {
    clearCachedAuthData();
    const fullUser = await fetchUserData(true);
    setUser(fullUser);
    return fullUser;
  }, [fetchUserData]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signOut,
        availableStructures,
        availableProjects,
        currentStructure,
        setCurrentStructure,
        currentProject,
        setCurrentProject,
        refreshAuthData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

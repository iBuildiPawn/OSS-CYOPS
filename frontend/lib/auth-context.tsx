"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { removeAuthToken } from "@/lib/api";
import {
  getTokenExpirationTime,
  isTokenExpired,
  validateAuthToken,
} from "@/lib/auth-guard";
import type { User } from "@/types/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Validate token on mount
    const checkAuth = async () => {
      const isValid = validateAuthToken();
      if (!isValid) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Token is valid
      setIsLoading(false);
    };

    checkAuth();

    // Set up token expiration monitoring
    const monitorTokenExpiration = () => {
      const isValid = validateAuthToken();
      if (!isValid && user) {
        // Token expired while user was active
        logout();
      }
    };

    // Check token expiration every minute
    const interval = setInterval(monitorTokenExpiration, 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const checkAuth = (): boolean => {
    const isValid = validateAuthToken();
    if (!isValid) {
      setUser(null);
      return false;
    }
    return true;
  };

  const logout = () => {
    setUser(null);
    removeAuthToken();

    // CRITICAL: Clear all React Query cache to prevent stale data
    queryClient.clear();

    router.push("/signin");
  };

  const value = {
    user,
    isAuthenticated: validateAuthToken(),
    isLoading,
    setUser,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

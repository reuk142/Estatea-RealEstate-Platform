import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { request } from "../services/api";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const result = await request<{ user: User }>({ url: "/users/me" });
      setUser(result.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refreshUser(); }, [refreshUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await request<{ user: User }>({ url: "/auth/login", method: "POST", data: { email, password } });
    setUser(result.user);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string, phone: string) => {
    const result = await request<{ user: User }>({ url: "/auth/register", method: "POST", data: { name, email, password, phone } });
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    await request({ url: "/auth/logout", method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signUp, signOut, refreshUser }), [user, loading, signIn, signUp, signOut, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
} 

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { api } from "../api/client";

type AuthCtx = {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithTokens: (access: string, refresh: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem("access_token")
  );

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setIsAuthenticated(true);
  }, []);

  const loginWithTokens = useCallback((access: string, refresh: string) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, loginWithTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

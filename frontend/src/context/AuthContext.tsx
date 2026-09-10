import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { FinancialEntity, User } from "../types";

interface AuthContextValue {
  user: User | null;
  entity: FinancialEntity | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [entity, setEntity] = useState<FinancialEntity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data.user);
        const active = res.data.entities.find((e: FinancialEntity) => e.id === res.data.activeEntityId);
        setEntity(active ?? res.data.entities[0] ?? null);
      })
      .catch(() => {
        localStorage.removeItem("token");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    setEntity(res.data.entity);
  }

  async function register(name: string, email: string, password: string) {
    const res = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    setEntity(res.data.entity);
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    setEntity(null);
  }

  return (
    <AuthContext.Provider value={{ user, entity, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

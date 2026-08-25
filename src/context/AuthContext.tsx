import { createContext, useContext, useState, ReactNode } from 'react';

type User = { username: string };
type AuthCtx = {
  user: User | null;
  login: (u: string, p: string) => { ok: boolean; error?: string };
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({ user: null, login: () => ({ ok: false }), logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('vin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (u: string, p: string) => {
    // Local replica authentication deliberately has no reference credentials.
    // A real auth provider can replace this boundary without changing UI code.
    if (!u.trim() || !p) return { ok: false, error: 'Username and password are required' };
    const usr = { username: u.trim() };
    setUser(usr);
    localStorage.setItem('vin_user', JSON.stringify(usr));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vin_user');
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

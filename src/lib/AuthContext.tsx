import { createContext, useContext, type ReactNode } from 'react';
import { api, useCurrentUser } from './store';
import type { UserProfile } from './types';

interface AuthCtx {
  user: UserProfile | null;
  login: (email: string, name?: string) => UserProfile;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  login: () => {
    throw new Error('no provider');
  },
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  return (
    <Ctx.Provider value={{ user, login: api.login, logout: api.logout }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

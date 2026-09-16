import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, useCurrentUser } from './store';
import type { UserProfile } from './types';

interface AuthCtx {
  user: UserProfile | null;
  loading: boolean;      // true pendant le chargement initial de l'état
  request: (email: string, name?: string) => Promise<string>;
  verify: (token: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  request: async () => 'ok',
  verify: async () => { throw new Error('no provider'); },
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // au démarrage, si on a un token, rechargue l'état
    api.refresh().catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        request: (email, name) => api.request(email, name).then((r) => r.message),
        verify: (token) => api.verify(token),
        logout: () => api.logout(),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

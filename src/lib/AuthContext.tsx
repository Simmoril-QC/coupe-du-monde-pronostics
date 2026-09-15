import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { UserProfile } from './types';

interface AuthCtx {
  user: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

async function fetchProfile(uid: string): Promise<UserProfile | null> {
  // Le trigger backend crée la ligne users à l'inscription ; on réessaie quelques fois
  for (let i = 0; i < 3; i++) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (!error && data) return data as UserProfile;
    if (i < 2) await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string) => {
    const profile = await fetchProfile(uid);
    setUser(profile);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const session = data.session;
        if (session) {
          load(session.user.id).finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) load(session.user.id);
      else setUser(null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (user) await load(user.id);
  }, [user, load]);

  return <Ctx.Provider value={{ user, loading, signOut, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

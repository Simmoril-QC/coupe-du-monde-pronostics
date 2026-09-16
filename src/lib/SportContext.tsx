import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useDB } from './store';
import type { Group, SportInfo } from './types';

interface SportCtx {
  sport: string;                    // id du sport actuellement sélectionné (ex: 'football-m')
  setSport: (id: string) => void;
  sports: SportInfo[];
  info: SportInfo | undefined;      // métadonnées du sport courant
  groupSport: (g: Group) => string; // raccourci
}

const KEY = 'wc2026-sport';
const Ctx = createContext<SportCtx | null>(null);

export function SportProvider({ children }: { children: ReactNode }) {
  const db = useDB();
  const [sport, setSportState] = useState<string>(() => localStorage.getItem(KEY) || 'football-m');

  useEffect(() => {
    // si le sport courant a disparu, retombe sur le premier
    if (db.sports.length && !db.sports.some((s) => s.id === sport)) setSportState(db.sports[0].id);
  }, [db.sports, sport]);

  const setSport = (id: string) => {
    setSportState(id);
    localStorage.setItem(KEY, id);
  };

  const value = useMemo<SportCtx>(
    () => ({ sport, setSport, sports: db.sports, info: db.sports.find((s) => s.id === sport), groupSport: (g) => g.sport }),
    [sport, db.sports]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSport = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('SportProvider manquant');
  return c;
};

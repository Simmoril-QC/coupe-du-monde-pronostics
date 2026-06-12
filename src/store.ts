import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name?: string;
  is_admin: boolean;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
}

interface Match {
  id: string;
  external_id: string;
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
  status: 'scheduled' | 'live' | 'finished';
  match_date: string;
  stage: string;
}

interface Prediction {
  match_id: string;
  predicted_winner?: 'home' | 'away' | 'draw';
  home_score?: number;
  away_score?: number;
}

interface AppState {
  user: User | null;
  groups: Group[];
  matches: Match[];
  predictions: Record<string, Prediction>;
  
  setUser: (user: User | null) => void;
  setGroups: (groups: Group[]) => void;
  setMatches: (matches: Match[]) => void;
  addPrediction: (prediction: Prediction) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  groups: [],
  matches: [],
  predictions: {},
  
  setUser: (user) => set({ user }),
  setGroups: (groups) => set({ groups }),
  setMatches: (matches) => set({ matches }),
  addPrediction: (prediction) => set((state) => ({
    predictions: { ...state.predictions, [prediction.match_id]: prediction }
  }))
}));

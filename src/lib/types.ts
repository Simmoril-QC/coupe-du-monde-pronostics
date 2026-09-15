export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  owner_id: string;
  created_at: string;
}

export interface GroupMember {
  user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  role: string;
  users?: { id: string; name: string | null; email: string } | null;
}

export interface Match {
  id: string;
  external_id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'live' | 'finished';
  match_date: string;
  stage: string;
  group_name: string | null;
}

export interface Prediction {
  id?: string;
  user_id: string;
  match_id: string;
  predicted_winner: 'home' | 'away' | 'draw' | null;
  home_score: number | null;
  away_score: number | null;
}

export interface Invitation {
  id: string;
  group_id: string;
  email: string;
  code: string;
  status: string;
  groups?: { name: string } | null;
}

export const STAGE_LABELS: Record<string, string> = {
  group_stage: 'Phase de groupes',
  round_of_16: '1/8 de finale',
  quarter_final: '1/4 de finale',
  semi_final: 'Demi-finale',
  final: 'FINALE',
};

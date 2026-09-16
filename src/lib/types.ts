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
  code: string;
  sport: string;
  owner_id: string;
  created_at: string;
}

export interface GroupMember {
  user_id: string;
  group_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  role: string;
}

export interface Match {
  id: string;
  external_id: string;
  sport: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'live' | 'finished';
  match_date: string | null;
  stage: string;
  group_name: string | null;
  pen_score?: string | null;
  aet?: boolean;
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
  status: string;
}

export interface SportInfo {
  id: string;
  label: string;
  sport: string;
  gender: string;
  tournament: string;
  count: number;
}

export const STAGE_LABELS: Record<string, string> = {
  group_stage: 'Phase de groupes',
  round_of_32: '32e de finale',
  round_of_16: '16e de finale',
  quarter_final: 'Quart de finale',
  semi_final: 'Demi-finale',
  third_place: 'Match de 3e place',
  fifth_place: 'Match pour la 5e place',
  seventh_place: 'Match pour la 7e place',
  classification: 'Classement (5e-8e)',
  qualification_round: 'Qualification (3e place)',
  final: 'FINALE',
};

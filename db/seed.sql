-- ============================================
-- World Cup App - Schema v2 (à ré-exécuter dans le SQL Editor)
-- Ce script DROP les tables existantes et les recrée proprement.
-- ============================================

DROP TABLE IF EXISTS config;
DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS predictions;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS users;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. UTILISATEURS
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GROUPES
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    code TEXT UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 6)),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MEMBRES (invitations pending/accepted)
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(group_id, user_id)
);

-- 4. MATCHS
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','finished')),
    match_date TIMESTAMPTZ,
    stage TEXT NOT NULL DEFAULT 'group_stage',
    group_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRONOSTICS
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    predicted_winner TEXT CHECK (predicted_winner IN ('home','away','draw')),
    home_score INTEGER,
    away_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, match_id)
);

-- 6. INVITATIONS (emails non encore inscrits)
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, email)
);

-- 7. CONFIGURATION
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_match ON predictions(match_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- users : lecture/écriture de son propre profil
CREATE POLICY users_select ON users FOR SELECT USING (
    id = auth.uid()
    OR (SELECT COALESCE(is_admin,false) FROM users WHERE id = auth.uid())
);
CREATE POLICY users_update ON users FOR UPDATE USING (id = auth.uid());

-- groups : lecture si membre, création/édition par owner
CREATE POLICY groups_select ON groups FOR SELECT USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid())
);
CREATE POLICY groups_insert ON groups FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY groups_update ON groups FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY groups_delete ON groups FOR DELETE USING (owner_id = auth.uid());

-- group_members : visible par les membres du groupe ; insert/update par owner (ou soi-même si accepted)
CREATE POLICY gm_select ON group_members FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM group_members g2 WHERE g2.group_id = group_members.group_id AND g2.user_id = auth.uid())
);
CREATE POLICY gm_insert ON group_members FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM group_members g2 WHERE g2.group_id = group_members.group_id AND g2.user_id = auth.uid() AND g2.role IN ('owner','admin'))
);
CREATE POLICY gm_update ON group_members FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM group_members g2 WHERE g2.group_id = group_members.group_id AND g2.user_id = auth.uid() AND g2.role IN ('owner','admin'))
);
CREATE POLICY gm_delete ON group_members FOR DELETE USING (
    EXISTS (SELECT 1 FROM group_members g2 WHERE g2.group_id = group_members.group_id AND g2.user_id = auth.uid() AND g2.role IN ('owner','admin'))
);

-- matches : lecture publique, écriture réservée au service role
CREATE POLICY matches_select ON matches FOR SELECT USING (true);

-- predictions : lecture/écriture de ses propres
CREATE POLICY pred_select ON predictions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY pred_insert ON predictions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY pred_update ON predictions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY pred_delete ON predictions FOR DELETE USING (user_id = auth.uid());

-- invitations : lecture/écriture par l'owner du groupe
CREATE POLICY inv_select ON invitations FOR SELECT USING (
    EXISTS (SELECT 1 FROM groups g WHERE g.id = invitations.group_id AND g.owner_id = auth.uid())
);
CREATE POLICY inv_insert ON invitations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM groups g WHERE g.id = invitations.group_id AND g.owner_id = auth.uid())
);
CREATE POLICY inv_delete ON invitations FOR DELETE USING (
    EXISTS (SELECT 1 FROM groups g WHERE g.id = invitations.group_id AND g.owner_id = auth.uid())
);

-- config : lecture publique, écriture réservée au service role (admin UI via RPC)
CREATE POLICY config_select ON config FOR SELECT USING (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Matchs de démonstration (à remplacer par les vrais via l'admin / l'API)
INSERT INTO matches (external_id, home_team, away_team, status, match_date, stage) VALUES
('wc_001', 'Canada', 'Mexique', 'scheduled', '2026-06-11 18:00:00+00', 'group_stage'),
('wc_002', 'États-Unis', 'Costa Rica', 'scheduled', '2026-06-12 15:00:00+00', 'group_stage'),
('wc_003', 'Argentine', 'Jamaïque', 'scheduled', '2026-06-13 18:00:00+00', 'group_stage'),
('wc_004', 'Maroc', 'Portugal', 'scheduled', '2026-06-14 15:00:00+00', 'group_stage'),
('wc_final_2026', 'À définir', 'À définir', 'scheduled', '2026-07-19 18:00:00+00', 'final');

-- Configuration initiale
INSERT INTO config (key, value) VALUES
('match_data_provider', 'manual'),
('cron_interval_minutes', '15');

-- ============================================
-- RAPPEL : après exécution de ce script, exécuter AUSSI supabase-triggers.sql
-- ============================================

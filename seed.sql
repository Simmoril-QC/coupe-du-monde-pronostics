-- ============================================
-- World Cup App - Database Schema + Seed Data
-- Target: Supabase Postgres (PostgreSQL 15+)
-- ============================================

-- Extension for UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. UTILISATEURS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MEMBRES DES GROUPES (invitations pending/accepted)
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(group_id, user_id)
);

-- 4. MATCHS (récupérés via API + cron GitHub Actions)
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL, -- ID from FIFA API
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'live', 'finished'
    match_date TIMESTAMPTZ,
    stage TEXT, -- 'group_stage', 'round_of_16', 'quarter_final', 'semi_final', 'final'
    group_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRONOSTICS
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    predicted_winner TEXT, -- 'home', 'away', 'draw'
    home_score INTEGER,
    away_score INTEGER,
    is_finalist BOOLEAN DEFAULT FALSE, -- true if prediction for final
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, match_id)
);

-- 6. CONFIGURATION (pour l'admin)
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_match ON predictions(match_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Policies for `groups`
CREATE POLICY "Users can view their own groups" ON groups FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid())
);
CREATE POLICY "Authenticated users can create groups" ON groups FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policies for `group_members`
CREATE POLICY "Users can view their group members" ON group_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
    ) AND user_id = auth.uid())
);

-- Policies for `predictions`
CREATE POLICY "Users can view own predictions" ON predictions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert/update own predictions" ON predictions FOR ALL USING (user_id = auth.uid());

-- ============================================
-- SEED DATA: 48 ÉQUIPES COUPE DU MONDE 2026
-- Source: Official FIFA World Cup 2026 participants
-- ============================================

INSERT INTO matches (external_id, home_team, away_team, status, match_date, stage) VALUES
('wc_001', 'Canada', 'Mexico', 'scheduled', '2026-06-11 18:00:00+00', 'group_stage'),
('wc_002', 'United States', 'Costa Rica', 'scheduled', '2026-06-12 15:00:00+00', 'group_stage'),
('wc_003', 'Argentina', 'Jamaica', 'scheduled', '2026-06-13 18:00:00+00', 'group_stage'),
('wc_004', 'Morocco', 'Portugal', 'scheduled', '2026-06-14 15:00:00+00', 'group_stage');

-- Final match placeholder (will be updated via API)
INSERT INTO matches (external_id, home_team, away_team, status, match_date, stage) VALUES
('wc_final_2026', 'TBD', 'TBD', 'scheduled', '2026-07-19 18:00:00+00', 'final');

-- Admin user (for initial setup)
INSERT INTO users (email, name, is_admin) VALUES
('admin@worldcup.local', 'Admin System', TRUE);

-- ============================================
-- DEFAULT CONFIGURATION
-- ============================================

INSERT INTO config (key, value) VALUES
('api_last_sync', NOW()::TEXT),
('match_data_provider', 'fifa_api_free'),
('cron_interval_minutes', '15');

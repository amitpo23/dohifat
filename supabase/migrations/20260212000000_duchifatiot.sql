-- ============================================
-- הדוכיפתיות — Family Birthday Weekend Game
-- Migration: Drop old Kahoot schema, create new
-- ============================================

-- Drop old tables
DROP VIEW IF EXISTS game_results;
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS choices CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS quiz_sets CASCADE;
DROP FUNCTION IF EXISTS add_question;

-- ============================================
-- NEW SCHEMA
-- ============================================

-- Teams
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color_bg TEXT NOT NULL,
  color_light TEXT NOT NULL,
  score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team_id INT REFERENCES teams(id),
  device_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Photos gallery
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id),
  team_id INT REFERENCES teams(id),
  image_url TEXT NOT NULL,
  ai_caption TEXT,
  caption_type TEXT DEFAULT 'claude',
  segment INT,
  likes UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Challenge completions
CREATE TABLE completions (
  id SERIAL PRIMARY KEY,
  challenge_key TEXT NOT NULL,
  team_id INT REFERENCES teams(id),
  player_id UUID REFERENCES players(id),
  points INT NOT NULL,
  segment INT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_key, team_id)
);

-- Trivia answers
CREATE TABLE trivia_answers (
  id SERIAL PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  question_index INT NOT NULL,
  correct BOOLEAN NOT NULL,
  points_earned INT DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, question_index)
);

-- Score log (audit trail + live feed)
CREATE TABLE score_log (
  id SERIAL PRIMARY KEY,
  team_id INT REFERENCES teams(id),
  player_id UUID REFERENCES players(id),
  points INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Game mini-game plays (prevent spam)
CREATE TABLE game_plays (
  id SERIAL PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  game_type TEXT NOT NULL,
  segment INT NOT NULL,
  score INT,
  played_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, game_type, segment)
);

-- Votes
CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  voter_id UUID REFERENCES players(id),
  category TEXT NOT NULL,
  target_id TEXT NOT NULL,
  segment INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(voter_id, category, segment)
);

-- ============================================
-- RPC: Increment team score atomically
-- ============================================
CREATE OR REPLACE FUNCTION increment_team_score(team_id_input INT, points_input INT)
RETURNS void AS $$
BEGIN
  UPDATE teams SET score = score + points_input WHERE id = team_id_input;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Enable Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE photos;
ALTER PUBLICATION supabase_realtime ADD TABLE score_log;
ALTER PUBLICATION supabase_realtime ADD TABLE completions;

-- ============================================
-- RLS Policies (allow all — family game, no auth)
-- ============================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON completions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON score_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON trivia_answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON game_plays FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON votes FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Seed teams
-- ============================================
INSERT INTO teams (name, emoji, color_bg, color_light) VALUES
  ('שועלי המדבר', '🦊', '#D4663C', '#FFF0E8'),
  ('לטאות הערבה', '🦎', '#1B998B', '#E6F7F5'),
  ('צברים חמים', '🌵', '#C73E4A', '#FDE8EA'),
  ('נשרי הנגב', '🦅', '#7B2D8E', '#F3E6F7'),
  ('גמלים פראיים', '🐫', '#D4943C', '#FEF4E0'),
  ('עקרבי הלילה', '🦂', '#2D5DA1', '#E4ECF8');

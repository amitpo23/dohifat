-- ============================================
-- Chat messages table
-- ============================================
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  team_id INT REFERENCES teams(id),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON messages FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

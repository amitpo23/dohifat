-- Game rooms for turn-based tournaments
CREATE TABLE IF NOT EXISTS game_rooms (
  id SERIAL PRIMARY KEY,
  game_type TEXT NOT NULL CHECK (game_type IN ('tictactoe', 'checkers', 'backgammon', 'taki')),
  team_a INT REFERENCES teams(id),
  team_b INT REFERENCES teams(id),
  current_turn INT REFERENCES teams(id),
  game_state JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  winner_team_id INT REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read game_rooms" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "Allow all insert game_rooms" ON game_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update game_rooms" ON game_rooms FOR UPDATE USING (true);
CREATE POLICY "Allow all delete game_rooms" ON game_rooms FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;

-- Add image support to chat messages
ALTER TABLE game_messages ADD COLUMN IF NOT EXISTS image_url TEXT;

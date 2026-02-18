-- Game settings table for admin-controlled features (timer, surprise games, etc.)
CREATE TABLE IF NOT EXISTS game_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY game_settings_read ON game_settings FOR SELECT USING (true);
CREATE POLICY game_settings_write ON game_settings FOR ALL USING (true);

-- Initialize default settings
INSERT INTO game_settings (key, value) VALUES
  ('timer', '{"start_time": null, "end_time": null, "active": false}'::jsonb),
  ('surprise_game', '{"active": false, "game_type": null, "room_id": null, "triggered_at": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

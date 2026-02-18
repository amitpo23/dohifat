-- Create challenges table (replaces hardcoded src/lib/challenges.ts)
CREATE TABLE IF NOT EXISTS challenges (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  segment INT NOT NULL,
  title TEXT NOT NULL,
  points INT NOT NULL DEFAULT 10,
  type TEXT NOT NULL DEFAULT 'field' CHECK (type IN ('photo', 'field')),
  icon TEXT NOT NULL DEFAULT '🎯',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read challenges" ON challenges FOR SELECT USING (true);
CREATE POLICY "Allow all insert challenges" ON challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update challenges" ON challenges FOR UPDATE USING (true);
CREATE POLICY "Allow all delete challenges" ON challenges FOR DELETE USING (true);

-- Seed with existing hardcoded challenges
INSERT INTO challenges (key, segment, title, points, type, icon, sort_order) VALUES
  -- Segment 1: נסיעה לדרום
  ('s1p1', 1, 'שלט מצחיק בדרך', 10, 'photo', '📸', 1),
  ('s1p2', 1, 'נוף מדברי ראשון!', 10, 'photo', '📸', 2),
  ('s1p3', 1, 'סלפי כל הנוסעים במכונית', 15, 'photo', '📸', 3),
  ('s1p4', 1, 'דוכיפת אמיתית!! (בונוס!)', 25, 'photo', '📸', 4),
  ('s1f1', 1, 'הכינו פלייליסט נסיעה והצביעו', 15, 'field', '🎵', 5),
  ('s1f2', 1, 'נחשו שעת הגעה מדויקת', 20, 'field', '⏱️', 6),
  -- Segment 2: ערב בצימרים
  ('s2p1', 2, 'תמונה הכי יצירתית של הצימר', 15, 'photo', '📸', 1),
  ('s2p2', 2, 'סלפי עם הדוכיפתיות!', 15, 'photo', '📸', 2),
  ('s2p3', 2, 'תמונה הכי מצחיקה של הערב', 20, 'photo', '📸', 3),
  ('s2f1', 2, 'טוסט/ברכה לדוכיפתיות!', 30, 'field', '🎤', 4),
  ('s2f2', 2, 'סרטון ברכה קבוצתי', 20, 'field', '🎬', 5),
  -- Segment 3: טיול + כפר אומנים
  ('s3p1', 3, 'סלפי קבוצתי בנקודה הגבוהה', 20, 'photo', '📸', 1),
  ('s3p2', 3, 'תמונה עם צמח מדברי', 10, 'photo', '📸', 2),
  ('s3p3', 3, 'תמונה עם אומן מקומי', 15, 'photo', '📸', 3),
  ('s3p4', 3, 'פירמידה אנושית!', 25, 'photo', '📸', 4),
  ('s3f1', 3, 'מצאו 5 סוגי אבנים שונים', 20, 'field', '🪨', 5),
  ('s3f2', 3, 'מגדל אבנים הכי גבוה', 25, 'field', '🏰', 6),
  ('s3f3', 3, 'מצאו 3 עקבות בעלי חיים', 20, 'field', '🐾', 7),
  ('s3f4', 3, 'ציירו דוכיפת בחול!', 15, 'field', '🎨', 8),
  ('s3f5', 3, 'הכינו כתר מחומרי טבע', 25, 'field', '👑', 9),
  ('s3f6', 3, 'למדו 3 מילים מתייר', 20, 'field', '🗣️', 10),
  -- Segment 4: ערב במסעדת מואה
  ('s4p1', 4, 'מנת אוכל הכי משגעת', 10, 'photo', '📸', 1),
  ('s4p2', 4, 'סלפי שולחן חגיגי', 15, 'photo', '📸', 2),
  ('s4p3', 4, 'כוכבים בלילה', 20, 'photo', '📸', 3),
  ('s4f1', 4, 'כתבו שיר יומהולדת מקורי!', 30, 'field', '🎤', 4),
  ('s4f2', 4, 'חיקוי תמונה ישנה של המשפחה', 30, 'field', '📷', 5),
  -- Segment 5: בוקר + הכרזת זוכה
  ('s5p1', 5, 'תמונת זריחה (בונוס!)', 25, 'photo', '📸', 1),
  ('s5p2', 5, 'סלפי פרידה קבוצתי', 15, 'photo', '📸', 2),
  ('s5p3', 5, 'דבר הכי מוזר שמצאתם', 15, 'photo', '📸', 3)
ON CONFLICT (key) DO NOTHING;

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE challenges;

-- ============================================
-- Trivia Questions Management
-- Migration: Add trivia_questions table, update trivia_answers
-- ============================================

-- Create trivia_questions table
CREATE TABLE trivia_questions (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_index INT NOT NULL,
  points INT DEFAULT 10,
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS with "Allow all" (family game, no auth)
ALTER TABLE trivia_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON trivia_questions FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trivia_questions;

-- Add question_id to trivia_answers for DB-backed questions
ALTER TABLE trivia_answers ADD COLUMN question_id INT REFERENCES trivia_questions(id);

-- Seed existing hardcoded questions
INSERT INTO trivia_questions (question, options, correct_index, points, category) VALUES
  ('מה השם של המכתש הגדול בעולם?', ARRAY['מכתש רמון','מכתש גדול','מכתש קטן','גרנד קניון'], 0, 10, 'ערבה'),
  ('כמה כוכבים רואים בערבה בלילה בהיר?', ARRAY['כ-1,000','כ-3,000','כ-6,000','כ-10,000'], 2, 10, 'ערבה'),
  ('מהו הים הכי נמוך בעולם?', ARRAY['כנרת','ים סוף','ים המלח','ים התיכון'], 2, 10, 'ערבה'),
  ('מה הטמפרטורה הכי גבוהה שנמדדה בישראל?', ARRAY['48°C','50°C','54°C','46°C'], 2, 15, 'ערבה'),
  ('באיזו שנה הוקמה אילת?', ARRAY['1949','1951','1948','1955'], 0, 15, 'ערבה'),
  ('מהי הציפור הלאומית של ישראל?', ARRAY['שלדג','דוכיפת','עיט','נשר'], 1, 15, '🐦'),
  ('למה קוראים לדוכיפת ״דוכיפת״?', ARRAY['הציצית על הראש','מילה בערבית','שם מגלה הציפור','הקול שלה'], 0, 15, '🐦'),
  ('מהי הציפור הגדולה ביותר בישראל?', ARRAY['נשר מקראי','עיט זהוב','חסידה','שקנאי'], 0, 10, 'טבע'),
  ('איזה עץ הכי נפוץ בערבה?', ARRAY['אקליפטוס','שיטה','דקל','תמר'], 1, 10, 'טבע'),
  ('מהו הפרח הלאומי של ישראל?', ARRAY['כלנית','רקפת','חרצית','סביון'], 0, 10, 'טבע'),
  ('מה המשקה הלאומי של ישראל?', ARRAY['קפה שחור','לימונענע','ערק','גזוז'], 2, 10, 'כללי'),
  ('🐦 מי מהדוכיפתיות יותר דוחפת את המקור?', ARRAY['אמא!','דודה!','שתיהן באותה רמה!','תלוי ביום'], 2, 20, '👩‍👩‍👧'),
  ('🐦 מה הדוכיפתיות יגידו כשרואות את כולם?', ARRAY['איזה יופי!','מי רעב?!','תמונה! תמונה!','למה ככה לבושים?!'], 2, 15, '👩‍👩‍👧');

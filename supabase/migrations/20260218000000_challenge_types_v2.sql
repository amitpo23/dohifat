-- Extend challenges table: add video + photo_match types, description, reference_image

-- 1. Drop existing CHECK constraint on type column
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'challenges'::regclass AND contype = 'c'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE challenges DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

-- 2. Add new CHECK with expanded types
ALTER TABLE challenges ADD CONSTRAINT challenges_type_check
  CHECK (type IN ('photo', 'field', 'video', 'photo_match'));

-- 3. Add description column
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Add reference_image column (for photo_match type)
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS reference_image TEXT;

-- 5. Add media_type to photos table (for gallery to distinguish video vs image)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image'
  CHECK (media_type IN ('image', 'video'));

-- 6. Seed creative challenges for Day 1
INSERT INTO challenges (key, segment, title, description, points, type, icon, sort_order) VALUES
  -- Photo challenges
  ('d1_animal_shape', 1, '2 ילדים 2 מבוגרים בצורה של חיה', 'צלמו תמונה של 2 ילדים ו-2 מבוגרים שמסתדרים ביחד בצורה של חיה - תנו לדמיון לעבוד!', 15, 'photo', '🐾', 20),
  ('d1_two_feet', 1, '4 אנשים שרק 2 רגליים נוגעות ברצפה', 'צלמו 4 אנשים שעומדים ביחד כך שרק 2 רגליים מכל הקבוצה נוגעות ברצפה!', 20, 'photo', '🦶', 21),
  ('d1_pile', 1, '3 אנשים לא קרבה ראשונה בערימה', 'צלמו ערימה של 3 אנשים שאינם קרובי משפחה מדרגה ראשונה', 15, 'photo', '🤸', 22),
  ('d1_oded_air', 1, 'בונוס! תמונה של עודד באוויר', 'צלמו את עודד קופץ באוויר - התזמון הוא הכל!', 25, 'photo', '🦅', 23),
  -- Video challenges
  ('d1_birthday_vid', 1, 'ברכת יום הולדת מקורית לדוכיפת', 'הקליטו סרטון ברכה מקורי ויצירתי ליום ההולדת - עד 30 שניות!', 20, 'video', '🎬', 24),
  ('d1_phrase_vid', 1, 'אני דוכיפת ואין כמוני בעולם', 'צלמו סרטון של אחת הדוכיפתיות אומרת את המשפט "אני דוכיפת ואין כמוני בעולם"', 15, 'video', '🎤', 25),
  -- Photo match challenges (reference_image will be uploaded by admin)
  ('d1_match1', 1, 'חקו את התמונה!', 'העתיקו את התמונה המקורית בצורה הכי מדויקת שאתם יכולים', 20, 'photo_match', '🖼️', 26),
  ('d1_match2', 1, 'שחזרו את הרגע!', 'שחזרו את הרגע מהתמונה המקורית - מי יצליח הכי טוב?', 20, 'photo_match', '📷', 27),
  ('d1_match3', 1, 'תמונה מחדש!', 'צרו מחדש את התמונה המקורית עם הדוכיפתיות', 20, 'photo_match', '🎭', 28)
ON CONFLICT (key) DO NOTHING;

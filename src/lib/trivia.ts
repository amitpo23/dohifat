export interface TriviaQuestion {
  question: string
  options: string[]
  correctIndex: number
  points: number
  category: string
}

export const TRIVIA: TriviaQuestion[] = [
  // ערבה
  {
    question: 'מה השם של המכתש הגדול בעולם?',
    options: ['מכתש רמון', 'מכתש גדול', 'מכתש קטן', 'גרנד קניון'],
    correctIndex: 0,
    points: 10,
    category: 'ערבה',
  },
  {
    question: 'כמה כוכבים רואים בערבה בלילה בהיר?',
    options: ['כ-1,000', 'כ-3,000', 'כ-6,000', 'כ-10,000'],
    correctIndex: 2,
    points: 10,
    category: 'ערבה',
  },
  {
    question: 'מהו הים הכי נמוך בעולם?',
    options: ['כנרת', 'ים סוף', 'ים המלח', 'ים התיכון'],
    correctIndex: 2,
    points: 10,
    category: 'ערבה',
  },
  {
    question: 'מה הטמפרטורה הכי גבוהה שנמדדה בישראל?',
    options: ['48°C', '50°C', '54°C', '46°C'],
    correctIndex: 2,
    points: 15,
    category: 'ערבה',
  },
  {
    question: 'באיזו שנה הוקמה אילת?',
    options: ['1949', '1951', '1948', '1955'],
    correctIndex: 0,
    points: 15,
    category: 'ערבה',
  },

  // טבע
  {
    question: 'מהי הציפור הלאומית של ישראל?',
    options: ['שלדג', 'דוכיפת', 'עיט', 'נשר'],
    correctIndex: 1,
    points: 15,
    category: '🐦',
  },
  {
    question: 'למה קוראים לדוכיפת ״דוכיפת״?',
    options: ['הציצית על הראש', 'מילה בערבית', 'שם מגלה הציפור', 'הקול שלה'],
    correctIndex: 0,
    points: 15,
    category: '🐦',
  },
  {
    question: 'מהי הציפור הגדולה ביותר בישראל?',
    options: ['נשר מקראי', 'עיט זהוב', 'חסידה', 'שקנאי'],
    correctIndex: 0,
    points: 10,
    category: 'טבע',
  },
  {
    question: 'איזה עץ הכי נפוץ בערבה?',
    options: ['אקליפטוס', 'שיטה', 'דקל', 'תמר'],
    correctIndex: 1,
    points: 10,
    category: 'טבע',
  },
  {
    question: 'מהו הפרח הלאומי של ישראל?',
    options: ['כלנית', 'רקפת', 'חרצית', 'סביון'],
    correctIndex: 0,
    points: 10,
    category: 'טבע',
  },

  // כללי
  {
    question: 'מה המשקה הלאומי של ישראל?',
    options: ['קפה שחור', 'לימונענע', 'ערק', 'גזוז'],
    correctIndex: 2,
    points: 10,
    category: 'כללי',
  },

  // דוכיפתיות
  {
    question: '🐦 מי מהדוכיפתיות יותר דוחפת את המקור?',
    options: ['אמא!', 'דודה!', 'שתיהן באותה רמה!', 'תלוי ביום'],
    correctIndex: 2,
    points: 20,
    category: '👩‍👩‍👧',
  },
  {
    question: '🐦 מה הדוכיפתיות יגידו כשרואות את כולם?',
    options: ['איזה יופי!', 'מי רעב?!', 'תמונה! תמונה!', 'למה ככה לבושים?!'],
    correctIndex: 2,
    points: 15,
    category: '👩‍👩‍👧',
  },
]

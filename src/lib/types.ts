export interface Player {
  id: string
  name: string
  team_id: number
  device_id: string
  created_at: string
}

export interface Team {
  id: number
  name: string
  emoji: string
  color_bg: string
  color_light: string
  score: number
  created_at: string
}

export interface Photo {
  id: string
  player_id: string
  team_id: number
  image_url: string
  ai_caption: string | null
  caption_type: string
  segment: number | null
  likes: string[]
  created_at: string
  player?: Player
}

export interface Completion {
  id: number
  challenge_key: string
  team_id: number
  player_id: string
  points: number
  segment: number
  completed_at: string
}

export interface TriviaQuestion {
  id: number
  question: string
  options: string[]
  correct_index: number
  points: number
  category: string | null
  active: boolean
  created_at: string
}

export interface TriviaAnswer {
  id: number
  player_id: string
  question_index: number
  question_id: number | null
  correct: boolean
  points_earned: number
  answered_at: string
}

export interface ScoreEntry {
  id: number
  team_id: number
  player_id: string | null
  points: number
  reason: string
  created_at: string
}

export interface GamePlay {
  id: number
  player_id: string
  game_type: string
  segment: number
  score: number | null
  played_at: string
}

export interface Vote {
  id: number
  voter_id: string
  category: string
  target_id: string
  segment: number | null
  created_at: string
}

export type ChallengeType = 'photo' | 'field' | 'video' | 'photo_match'

export interface Challenge {
  id: number
  key: string
  segment: number
  title: string
  description: string | null
  points: number
  type: ChallengeType
  icon: string
  active: boolean
  sort_order: number
  reference_image: string | null
  created_at: string
}

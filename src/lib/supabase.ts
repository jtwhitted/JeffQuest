import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for your database
export type Game = {
  id: string
  bgg_id: string | null
  name: string
  category: string[]
  mechanics: string[]
  min_players: number | null
  max_players: number | null
  difficulty: string | null
  year_published: number | null
  description: string | null
  min_playtime: number | null
  max_playtime: number | null
  rating: number | null
  rating_count: number | null
  complexity: number | null
  designers: string[]
  publishers: string[]
  image_url: string | null
  rulebook_text: string | null
  created_at: string
  updated_at: string
}

export type Player = {
  id: string
  name: string
  avatar_url: string | null
  legendary_title: string | null
  legendary_bio: string | null
  created_at: string
  updated_at: string
}

export type Session = {
  id: string
  game_id: string | null
  date: string
  is_cooperative: boolean
  cooperative_result: string | null
  notes: string
  created_at: string
  updated_at: string
}

export type SessionPlayer = {
  id: string
  session_id: string
  player_id: string
  score: number | null
}
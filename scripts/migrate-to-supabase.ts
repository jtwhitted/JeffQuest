import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local')
dotenv.config({ path: envPath })

console.log('🔍 Checking environment variables...')
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Found' : '❌ Missing')
console.log('SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function migrate() {
  console.log('🚀 Starting migration to Supabase...')

  // Read JSON files
  const gamesPath = path.join(process.cwd(), 'src/data/games.json')
  const playersPath = path.join(process.cwd(), 'src/data/players.json')
  const sessionsPath = path.join(process.cwd(), 'src/data/sessions.json')

  const games = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'))
  const players = JSON.parse(fs.readFileSync(playersPath, 'utf-8'))
  const sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'))

  // Migrate Games
  console.log(`\n📚 Migrating ${games.length} games...`)
  let gamesSuccess = 0
  for (const game of games) {
    const { documents, ...gameData } = game
    
    const { error: gameError } = await supabase
      .from('games')
      .upsert({
        id: gameData.id,
        bgg_id: gameData.bggId || null,
        name: gameData.name,
        category: gameData.category || [],
        mechanics: gameData.mechanics || [],
        min_players: gameData.minPlayers || null,
        max_players: gameData.maxPlayers || null,
        difficulty: gameData.difficulty || null,
        year_published: gameData.yearPublished || null,
        description: gameData.description || null,
        min_playtime: gameData.minPlaytime || null,
        max_playtime: gameData.maxPlaytime || null,
        rating: gameData.rating || null,
        rating_count: gameData.ratingCount || null,
        complexity: gameData.complexity || null,
        designers: gameData.designers || [],
        publishers: gameData.publishers || [],
        image_url: gameData.imageUrl || null,
        rulebook_text: gameData.rulebookText || null,
      })

    if (gameError) {
      console.error(`❌ Error migrating game ${gameData.name}:`, gameError.message)
      continue
    }

    gamesSuccess++

    // Migrate documents if they exist
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        const { error: docError } = await supabase
          .from('game_documents')
          .upsert({
            id: doc.id,
            game_id: gameData.id,
            name: doc.name,
            text: doc.text || null,
          })

        if (docError) {
          console.error(`❌ Error migrating document ${doc.name}:`, docError.message)
        }
      }
    }
  }
  console.log(`✅ Migrated ${gamesSuccess}/${games.length} games successfully!`)

  // Migrate Players
  console.log(`\n👥 Migrating ${players.length} players...`)
  let playersSuccess = 0
  for (const player of players) {
    const { error } = await supabase
      .from('players')
      .upsert({
        id: player.id,
        name: player.name,
        avatar_url: player.avatarUrl || null,
        legendary_title: player.legendaryTitle || null,
        legendary_bio: player.legendaryBio || null,
      })

    if (error) {
      console.error(`❌ Error migrating player ${player.name}:`, error.message)
    } else {
      playersSuccess++
    }
  }
  console.log(`✅ Migrated ${playersSuccess}/${players.length} players successfully!`)

  // Migrate Sessions
  console.log(`\n🎲 Migrating ${sessions.length} sessions...`)
  let sessionsSuccess = 0
  for (const session of sessions) {
    const { error: sessionError } = await supabase
      .from('sessions')
      .upsert({
        id: session.id,
        game_id: session.gameId || null,
        date: session.date,
        is_cooperative: session.isCooperative || false,
        cooperative_result: session.cooperativeResult || null,
        notes: session.notes || '',
      })

    if (sessionError) {
      console.error(`❌ Error migrating session ${session.id}:`, sessionError.message)
      continue
    }

    sessionsSuccess++

    // Migrate session players
    if (session.scores && session.scores.length > 0) {
      for (const score of session.scores) {
        const { error: scoreError } = await supabase
          .from('session_players')
          .insert({
            session_id: session.id,
            player_id: score.playerId,
            score: score.score || null,
          })

        if (scoreError && !scoreError.message.includes('duplicate')) {
          console.error(`❌ Error migrating session player:`, scoreError.message)
        }
      }
    }
  }
  console.log(`✅ Migrated ${sessionsSuccess}/${sessions.length} sessions successfully!`)

  console.log('\n🎉 Migration complete!')
}

migrate().catch((error) => {
  console.error('💥 Migration failed:', error)
  process.exit(1)
})
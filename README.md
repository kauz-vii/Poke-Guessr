# 🎮 Poke-Guessr

A full-featured, competitive multiplayer web application where players race to guess Pokémon from their silhouettes. Transform from a Beginner trainer into a Pokémon Champion through Ranked Matchmaking, Daily Challenges, and Party Matches!

Built with modern web technologies, real-time syncing, and a sleek, animated dark-mode UI. 

## 🚀 Live Demo
Play the game here: [Poke-Guessr](https://poke-guessr-kaushik07oct2004-1414s-projects.vercel.app/)

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - Core UI framework
- **Vite** - Lightning-fast build tool and development server
- **React Router DOM** - Client-side routing
- **Vanilla CSS** - Custom CSS with glassmorphism, glowing micro-animations, and fully responsive mobile layouts.
- **PokéAPI** - Fetching Pokémon data (sprites, types, generation, flavor text)

### Backend & Database (Supabase)
- **Supabase Auth** - Email & Password authentication, Google OAuth, session management
- **Supabase Postgres** - Relational database for storing user profiles, game sessions, multiplayer rooms, friendships, and feedbacks
- **Row Level Security (RLS)** - Robust database security rules ensuring players can only access their own data or public room data
- **Supabase Realtime** - WebSockets for live multiplayer gameplay, lobby syncing, and matchmaking
- **Supabase Edge Functions** - Serverless TypeScript functions (Deno) used for triggering email notifications via Resend API
- **pg_cron** - Automated PostgreSQL jobs for handling Rank Decay in the competitive system.

---

## ✨ Features Breakdown

### 1. Core Gameplay & Mechanics
- **Dynamic Clue System:** Starts as a completely dark silhouette. Over time, the image becomes blurry, and eventually reveals the full Pokémon.
- **Three Difficulty Modes:**
  - **Trainer:** Easy mode. After 10 seconds, alternate letters are revealed. After 20 seconds, the silhouette is removed.
  - **Elite:** Standard silhouette guessing with standard length clues.
  - **Pokémon Master:** Hardcore mode. No hints, no lengths, only the dark silhouette.
- **Smart Generation & Selection:** Play exclusively with your favorite generations (Gen 1 through Gen 9). The game guarantees you won't see the same Pokémon twice within 50 rounds!
- **Seamless Loading:** The game preloads the next Pokémon's image in the background while you read the current Pokémon's Pokédex entry, completely eliminating loading screens between rounds.
- **Forgiving Guess Engine:** Handles misspellings, hyphenated names (like `Ho-Oh`), and ignores gender suffixes automatically.

### 2. Account Progression & Personal Pokédex
- **Trainer Profiles:** Track total score, matches played, win rate, and total correct guesses.
- **XP & Leveling System:** Earn XP from every match. Level up from Level 1 all the way to Level 100.
- **Personal Pokédex:** A persistent collection of every Pokémon you've correctly guessed. Tap on a caught Pokémon to view its sprite, ID, elements, and read its official Pokédex fun fact!

### 3. Multiplayer Party Matches
- **Custom Lobbies:** Host a room with custom settings (Number of Rounds, Max Players, Generations, Difficulty).
- **Real-time Gameplay:** Supabase Realtime syncs the game state (timer, current Pokémon, player scores, round progression) across all clients instantly.
- **Host Migration:** If the host disconnects, host privileges automatically transfer to the next available player without interrupting the game.
- **Live Leaderboard:** See who guessed correctly first and watch the scores update live at the end of each round.

### 4. Ranked Matchmaking 🏆 (Unlocks at Level 10)
- **Competitive Queue:** Enter a global matchmaking queue for 1v1 Ranked Matches (locked to Elite difficulty, all Generations, fast rounds).
- **Placement Matches:** New players must complete 5 placement matches before receiving their official Rank Tier (Bronze, Silver, Gold, Platinum, Diamond, Master).
- **Advanced Rating System:** Features Elo-based point gains/losses, Win Streak tracking (Current & Highest), and Match MVP awards.
- **Rank Decay:** Master and Diamond players lose Elo if they remain inactive for too long.
- **Global Leaderboards:** Compare your Rating, Win Streaks, MVPs, and XP with top players around the world.

### 5. Social & Friends System
- **Friend List:** Search for other trainers by username and send friend requests.
- **Online Status:** See which of your friends are currently online (using Supabase Realtime Presence).
- **Party Invites:** Invite online friends directly to your custom Party lobbies.

### 6. User Feedback & Admin System
- **Floating Feedback Widget:** A beautiful, non-intrusive floating button available on every screen for users to submit bug reports or suggestions.
- **Email Notifications:** When the Admin replies to a user's feedback, a Supabase Edge Function triggers an automated email to the user (via Resend).

### 7. Production Security & Stability
- **Server-Authoritative Scoring:** Uses atomic PostgreSQL Remote Procedure Calls (RPCs) to handle XP and score incrementing. Double-submission exploits are blocked via `UNIQUE` constraints.
- **Resilient Realtime Sync:** Split-brain host conflicts and duplicate round advances are gracefully handled by robust WebSocket sync locks.
- **Rage-quit Penalties:** If a player disconnects during a ranked match, the game server automatically issues an Elo forfeit penalty.

---

## 💻 Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kauz-vii/Poke-Guessr.git
   cd Poke-Guessr
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5173`

*(To deploy Edge functions for email, use the Supabase CLI: `npx supabase functions deploy send-feedback-reply --project-ref YOUR_PROJECT_REF`)*

---
*Built by Kaushik & AI Assistant.*

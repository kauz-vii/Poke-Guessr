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
- **Vanilla CSS** - Custom CSS with glassmorphism, glowing micro-animations, and responsive layouts
- **PokéAPI** - Fetching Pokémon data (sprites, types, generation, flavor text)

### Backend & Database (Supabase)
- **Supabase Auth** - Email & Password authentication, session management
- **Supabase Postgres** - Relational database for storing user profiles, game sessions, multiplayer rooms, friendships, and feedbacks
- **Row Level Security (RLS)** - Robust database security rules ensuring players can only access their own data or public room data
- **Supabase Realtime** - WebSockets for live multiplayer gameplay, lobby syncing, and matchmaking
- **Supabase Edge Functions** - Serverless TypeScript functions (Deno) used for triggering email notifications via Resend API

---

## ✨ Features Breakdown

### 1. Core Gameplay
- **Dynamic Clue System:** Starts as a completely dark silhouette. Over time, the image becomes blurry, and eventually reveals the full Pokémon.
- **Three Difficulty Modes:**
  - **Trainer:** Easy mode. After 10 seconds, alternate letters are revealed. After 20 seconds, the silhouette is removed.
  - **Elite:** Standard silhouette guessing with standard length clues.
  - **Pokémon Master:** Hardcore mode. No hints, no lengths, only the dark silhouette.
- **Generation Filtering:** Play exclusively with your favorite generations (Gen 1 through Gen 9).
- **Smart Guess Validation:** Handles misspellings, hyphenated names (like `Ho-Oh`), and ignores gender suffixes automatically (e.g., typing "Nidoran" works for both Male and Female).

### 2. Account & Progression
- **Trainer Profiles:** Track total score, matches played, win rate, and total correct guesses.
- **XP & Leveling System:** Earn XP from every match. Level up from Level 1 all the way to Level 100.
- **Unlockable Ranks:** Reach Level 10 to unlock Ranked Matchmaking!
- **Achievements system:** Unlock badges for reaching milestones (e.g., "First Win", "Sharpshooter").

### 3. Multiplayer Party Matches
- **Custom Lobbies:** Host a room with custom settings (Number of Rounds, Max Players, Generations, Difficulty).
- **Real-time Gameplay:** Supabase Realtime syncs the game state (timer, current Pokémon, player scores, round progression) across all clients instantly.
- **Lobby Management:** The host can kick players, transfer host privileges automatically upon leaving, and start the game.
- **Live Leaderboard:** See who guessed correctly first and watch the scores update live at the end of each round.
- **Robust Disconnect Handling:** If a player leaves mid-match, the game adapts seamlessly. If only 2 players remain and one leaves, the remaining player automatically wins.

### 4. Ranked Matchmaking 🏆 (Unlocks at Level 10)
- **Global Queue:** Click "Ranked Match" to enter a global matchmaking queue.
- **1v1 Competitive Rules:** Locked to 5 rounds, 15 seconds per round, Elite difficulty, All Generations.
- **ELO Rating System:** Gain Rating points for winning, lose points for losing.
- **Seasonal Resets:** Compete in seasons. At the end of a season, top players earn rewards and ratings soft-reset.

### 5. Daily Challenge 📅
- **Global Seed:** Everyone in the world gets the exact same Pokémon for the Daily Challenge on a given day.
- **One Shot:** You only get one attempt per day. Make it count!
- **Daily Leaderboard:** Compete for the fastest guess time on the global daily leaderboard.

### 6. Social & Friends System
- **Friend List:** Search for other trainers by username and send friend requests.
- **Online Status:** See which of your friends are currently online (using Supabase Realtime Presence).
- **Party Invites:** Invite online friends directly to your custom Party lobbies.

### 7. User Feedback & Admin System
- **Floating Feedback Widget:** A beautiful, non-intrusive floating button available on every screen for users to submit bug reports or suggestions.
- **Admin Dashboard:** The developer can view all feedback in the app.
- **Email Notifications:** When the Admin replies to a user's feedback, a Supabase Edge Function triggers an automated, branded HTML email to the user (via Resend) notifying them of the response.

### 8. Production Security & Stability (New)
- **Server-Authoritative Scoring:** Prevents client-side hacking by using atomic PostgreSQL Remote Procedure Calls (RPCs) to handle XP and score incrementing. Double-submission exploits are blocked via `UNIQUE` database constraints.
- **Anti-Cheat Measures:** Strict Row Level Security (RLS) protects the matchmaking queues and player profiles. Tab-throttling exploits are nullified via absolute timestamp-based timers (`Date.now()`).
- **Resilient Realtime:** Split-brain host conflicts, ghost matchmaking rooms, and duplicate round advances are gracefully handled by robust WebSocket sync locks. If a player rage-quits a ranked match, the game server automatically issues an Elo forfeit penalty.
- **Master Pokemon Normalizer:** The guess validation engine flawlessly handles Unicode variants, Alolan/Galarian regional forms, hyphens, and specialized punctuations (e.g., typing "mr mime" perfectly matches "Mr. Mime").
- **Global Error Boundaries:** Ensures the React app never white-screens, instead providing a graceful recovery UI if an unexpected edge case occurs.

---

## 🎨 UI/UX & Design Philosophy
- **Premium Aesthetics:** Deep, rich dark mode (`#0f0c29` to `#24243e` gradients) combined with vibrant Pokémon colors.
- **Glassmorphism:** Frosted glass panels, translucent borders, and subtle glowing dropshadows (`box-shadow: 0 8px 32px rgba(...)`).
- **Micro-animations:** Hover effects, smooth transitions on buttons, expanding inputs, and a custom confetti celebration on victory.
- **Responsive:** Fully playable on Desktop, Tablet, and Mobile devices.

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

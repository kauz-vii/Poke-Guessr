# 🎮 Pokémon Guesser

A full-featured, competitive multiplayer web application where players race to guess Pokémon from their silhouettes. Transform from a Beginner trainer into a Pokémon Champion through Ranked Matchmaking, Daily Challenges, and Party Matches!

## ✨ Key Features

### 🏆 Competitive Multiplayer & Matchmaking
- **Ranked Matchmaking:** Enter the peer-to-peer global matchmaking queue to face off against opponents of similar skill.
- **Dynamic Elo System:** Win matches to earn rating points and climb the ranks from **Beginner** all the way up to the **Champion** tier.
- **Party Matches:** Create private lobby rooms with custom 4-letter invite codes. Host up to 4 friends in real-time, synchronized 10-round matches.

### 📅 Daily Challenge
- **Global Seed:** Every day features a new, globally synchronized sequence of 10 Pokémon.
- **One Attempt:** All players worldwide get exactly one attempt per day to complete the challenge.
- **Daily Leaderboard:** Compete for the highest score and fastest completion time on the exclusive Daily Challenge leaderboard.

### 👤 Progression & Social Systems
- **RPG Progression:** Earn XP for every correct guess and match victory to level up your trainer profile.
- **Achievements Engine:** Unlock 7 unique badges (e.g., *Speed Demon*, *Legendary Hunter*) by completing specific milestones.
- **Friends Hub:** Search for other trainers, send friend requests, and build your friends list to easily coordinate matches.
- **Global Leaderboards:** Compete across 4 distinct categories: Top Level, Best Game Score, Today's Daily, and Most Multiplayer Wins.

### 🎯 Single Player Practice
- **Generation Filters:** Filter the Pokédex to only include specific generations (e.g., Gen 1 & Gen 2 only).
- **Custom Difficulties:**
  - **Trainer:** Easy mode. After 10 seconds, alternate letters are revealed. After 20 seconds, the silhouette is removed.
  - **Elite:** Standard silhouette guessing with standard clues.
  - **Pokémon Master:** Hardcore mode. No hints, no lengths, only the dark silhouette.

## 🛠️ Tech Stack

This project is built using a modern, serverless architecture:

**Frontend**
- **Framework:** React (bootstrapped with Vite)
- **Routing:** React Router v6
- **Styling:** Vanilla CSS with custom CSS variables for theming (Dynamic glassmorphism, responsive grid layouts, curated color palettes)

**Backend & Infrastructure**
- **BaaS:** Supabase
- **Database:** PostgreSQL (with Row Level Security policies)
- **Realtime:** Supabase Realtime (WebSockets used for live multiplayer lobbies, game state synchronization, and matchmaking)
- **Authentication:** Supabase Auth (Email & Password)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- A [Supabase](https://supabase.com/) account and project.

### Installation

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Database Setup:**
   You will need to run several SQL migrations in your Supabase SQL Editor to create the necessary tables. Check the project documentation for the SQL scripts required for:
   - `profiles` (with XP, Level, and Rating tracking)
   - `rooms` and `player_scores` (for multiplayer)
   - `matchmaking_queue` (for ranked mode)
   - `daily_challenges` and `match_history`
   - `user_achievements`, `friends`, and `friend_requests`

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

## 🎨 Design Philosophy
The UI was meticulously crafted to provide a premium, modern gaming experience. It utilizes vibrant Pokémon-inspired colors (like `#FFCC00` for accents), sleek dark modes, subtle micro-animations on hover states, and smooth transitions to keep the interface feeling alive and engaging.

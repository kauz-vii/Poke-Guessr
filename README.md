# 🎮 Poke-Guessr

A full-featured, competitive multiplayer Pokémon guessing game where players race to identify Pokémon from their silhouettes. Battle through Ranked Matchmaking, conquer Daily & Weekly Challenges, grind Hardcore Mode, and connect with friends — all in a sleek, animated dark-mode UI.

Built with React, Supabase, and real-time WebSockets.

## 🚀 Live Demo

Play here: [Poke-Guessr](https://poke-guessr-kaushik07oct2004-1414s-projects.vercel.app/)

---

## 🛠️ Tech Stack

### Frontend
- **React 19** — Core UI framework
- **Vite** — Lightning-fast build tool
- **React Router DOM** — Client-side routing
- **Vanilla CSS** — Custom design system with glassmorphism, gradient animations, micro-interactions, and responsive mobile layouts
- **PokéAPI** — Pokémon sprites, types, generation data, and Pokédex flavor text

### Backend & Database (Supabase)
- **Supabase Auth** — Email/password + Google OAuth, persistent sessions
- **Supabase Postgres** — Relational database for profiles, game sessions, multiplayer rooms, friendships, social feeds, and more
- **Supabase Realtime** — WebSockets for live gameplay, lobby syncing, matchmaking, presence tracking, and social notifications
- **Row Level Security (RLS)** — Granular database security ensuring players only access permitted data
- **PostgreSQL RPCs** — Atomic server-side functions for scoring, reward claiming, and social operations
- **Supabase Edge Functions** — Serverless TypeScript (Deno) functions for email notifications via Resend
- **pg_cron** — Automated PostgreSQL jobs for rank decay

---

## ✨ Full Feature Breakdown

### 1. 🕹️ Core Gameplay & Mechanics

- **Dynamic Reveal System:** Starts as a pitch-black silhouette. Over time the image becomes blurry, then fully revealed — creating natural tension.
- **Three Difficulty Modes:**
  - **Trainer:** After 10s, alternate letters are revealed. After 20s, silhouette lifts.
  - **Elite:** Standard silhouette guessing with standard-length letter clues.
  - **Pokémon Master:** No hints, no lengths — silhouette only.
- **Smart Generation Selection:** Choose any combination of Gen 1–9. The game guarantees no repeated Pokémon within 50 rounds.
- **Seamless Loading:** Next Pokémon's image preloads in the background while you read the Pokédex entry — zero loading screens mid-game.
- **Forgiving Guess Engine:** Handles misspellings, hyphenated names (`Ho-Oh`), and ignores gender suffixes automatically.

---

### 2. 🎯 Game Modes

#### Singleplayer
Classic solo guessing session. Choose your difficulty, generation filter, and play at your own pace. All scores and XP are tracked.

#### Multiplayer (Party Match)
- Create a custom lobby with configurable rounds, max players, generation filter, and difficulty.
- Real-time gameplay via Supabase Realtime — timer, current Pokémon, scores, and round progression sync instantly across all players.
- Host Migration: if the host disconnects, privileges auto-transfer to the next player without interrupting the game.
- Live round-end leaderboard after every round.
- Invite online friends directly into your lobby from the Social Hub.

#### Ranked Match ⚔️ *(Unlocks at Level 10)*
- Enter a global 1v1 competitive queue (Elite difficulty, all generations, fast rounds).
- **Placement Matches:** Complete 5 placements to earn an official rank tier.
- **Rating Tiers:** Beginner → Poké Ball → Great Ball → Ultra Ball → Master Ball → Champion
- **Elo System:** Rating gains/losses based on opponent strength and match outcome.
- Win Streak tracking (current and highest).
- Match MVP awards for top performers.
- **Rank Decay:** Master/Champion players who go inactive lose rating automatically (via pg_cron).
- Global Leaderboard with Rating, Streaks, MVPs, and XP comparisons.

#### Hardcore Mode ☠️ *(Unlocks at Level 5)*
- **One wrong guess = elimination.** No second chances.
- Tracks a dedicated **Hardcore Round Streak** — survive as many rounds as possible.
- Personal best Hardcore streak stored permanently on your profile.

#### Daily Challenge 📅
- One unique Pokémon challenge per day — same for every player worldwide.
- Completing it awards bonus XP and is tracked separately on your profile.
- Progress logged to the friend activity feed.

#### Weekly Challenge 📆
- Four challenges active per month, rotating every Monday.
- 25+ different challenge types (e.g., "Guess 100 Pokémon", "Win 10 Ranked Matches", "Get 5 Fast Correct Guesses").
- A seeded deterministic shuffle ensures all players see the same 4 challenges each month, with no repeats from previous months.
- Progress accumulates across all game modes (Singleplayer, Multiplayer, Ranked, etc.).
- Dedicated Weekly Challenge page with progress bars and completion tracking.

---

### 3. 👤 Account Progression

- **XP & Leveling:** Earn XP from every match, correct guess, and daily reward. Level up from 1 to 100+.
- **Trainer Profiles:** View your total score, matches played, win rate, correct guesses, rating, win streaks, and hardcore records.
- **Trainer Title & Customization:** Set a custom trainer title, favourite Pokémon (with live sprite display), and favourite region.
- **Player Card:** A stylized card shown in lobbies and on your public profile.
- **Personal Pokédex:** Every Pokémon you've ever correctly guessed is permanently added to your Pokédex. Tap any entry to see its sprite, ID, type, generation, and official Pokédex flavor text.

---

### 4. 🎁 Daily Login Rewards *(New)*

- Claim one reward per calendar day — rewards increase over a 7-day cycle, then reset.
- **Reward Schedule:**
  | Day | Reward |
  |-----|--------|
  | 1   | ✨ +50 XP |
  | 2   | ⚡ +75 XP |
  | 3   | 🌟 +100 XP |
  | 4   | 💫 +125 XP |
  | 5   | 🔥 +150 XP |
  | 6   | 💎 +200 XP |
  | 7   | 👑 +300 XP + 🎖️ Rare Badge |
- **Auto-popup on first login of the day** — no manual navigation needed.
- **7-Day Calendar Strip** — shows claimed days (✅), today's reward (⭐), and upcoming rewards (🔒).
- **Streak Tracking:** Consecutive days build your login streak. Missing a day resets it back to Day 1.
- **Day 7 Celebration:** Confetti animation + golden badge glow when the Rare Badge is earned.
- **XP Float Animation:** Gold `+XP` particles float upward on claim.
- **Pulsing indicator** on the main menu button when a reward is waiting.
- **Profile Integration:** Login streak, best streak, last claimed date, and Rare Badge collection all displayed on your profile.
- **Fully Server-Side Secure:** Claim logic runs in a PostgreSQL `SECURITY DEFINER` RPC using UTC dates and `FOR UPDATE` row locking — immune to client clock manipulation and multi-tab duplicate claims.

---

### 5. 🌟 Social System *(New)*

#### Friends Hub (`/friends`) — 4-Tab Interface
- **👥 Friends Tab:** See your full friend list with real-time online status, current game activity (In Ranked Match, In Hardcore, Viewing Pokédex, etc.), pin favourites to the top, search for trainers by username, view profiles, and invite friends to party lobbies.
- **🔔 Requests Tab:** Accept or decline incoming friend requests; cancel outgoing pending requests.
- **📡 Activity Feed:** A live social feed of what your friends are up to — wins, rank promotions, achievement unlocks, win streaks, daily completions.
- **🕐 Recent Players Tab:** Players you've faced in multiplayer sessions appear here with quick Add Friend options.

#### Online Presence
- 10 status states: Offline, Online, In Menu, Playing Casual, In Ranked Match, In Party Match, In Daily, In Hardcore, Searching Match, Viewing Pokédex.
- Status updates automatically based on the current route.
- Coloured pulsing dot indicators on friend cards.
- Status is set to Offline on page/tab close.

#### Trainer Profiles (`/friends/:userId`)
- Public profile page for any trainer with their rank badge, level, XP progress bar, trainer title, favourite Pokémon sprite, and full stat grid.
- **Privacy Controls:** Profiles can be Public, Friends Only, or Private — stats hidden accordingly.
- Actions: Add Friend, Remove Friend, Invite to Party.

#### Notifications
- **Bell icon** on the main menu with a live unread count badge.
- Dropdown shows: friend requests, accepted requests, party invites, achievements, rank-ups.
- All notifications are read-cleared on open.

#### Party Invites
- When a friend invites you, a **real-time slide-up toast modal** appears anywhere in the app.
- Shows sender name, room code, and a countdown timer.
- Accept = instantly navigate to the lobby. Decline = dismiss.

#### Automatic Activity Logging
Game events are automatically broadcast to your friends' activity feeds:
- Multiplayer/Ranked match wins
- Win streak milestones (3, 5, 10, 15, 20, 25, 50)
- Achievement unlocks
- Rank tier promotions
- Daily challenge completions

---

### 6. 🏆 Achievements System

- Dozens of unlockable achievements tracked server-side (e.g., First Blood, Hot Streak, Pokémon Master, Generation Expert).
- Achievement unlocks trigger an in-app toast notification.
- Unlocked achievements displayed on your profile with a progress counter.
- Achievement unlocks are broadcast to the friend activity feed.

---

### 7. 📖 Personal Pokédex

- Persistent collection of every Pokémon you've correctly guessed, stored in the database.
- Filterable by generation and type.
- Click any entry to see the full Pokédex card: sprite, ID, type tags, generation, and official flavor text from PokéAPI.
- Completion percentage displayed per generation.

---

### 8. 💬 User Feedback & Admin System

- **Floating Feedback Widget:** Available on every screen — submit bug reports or feature suggestions without leaving the game.
- **Admin Reply System:** Admins can respond to feedback in the database.
- **Email Notifications:** A Supabase Edge Function (TypeScript/Deno) triggers an automated email to the user via Resend when an admin replies.

---

### 9. 🔒 Production Security & Stability

- **Server-Authoritative Scoring:** All XP, score, and match history updates run through atomic PostgreSQL RPCs. Double-submission exploits blocked by `UNIQUE` constraints.
- **Daily Reward Security:** UTC-based server-side date comparison + `FOR UPDATE` row locking prevents multi-tab exploits, clock manipulation, and timezone abuse.
- **Resilient Realtime Sync:** Split-brain host conflicts and duplicate round advances are handled by WebSocket sync locks.
- **Rage-quit Penalties:** Disconnecting mid-ranked match triggers an automatic Elo forfeit penalty.
- **RLS on all tables:** Players can only read/write data they are explicitly permitted to access.

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
   Create a `.env` file in the root directory:
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

### Database Setup
All game features require the Supabase schema to be set up. The full SQL migration history covers:
- Core profiles, match history, and Pokédex tables
- Multiplayer rooms and room players
- Ranked matchmaking queue and match history
- Friends and friend requests
- Social system tables (presence, activity feed, notifications, party invites, recent players)
- Daily login rewards columns and RPCs
- Weekly challenge tracking
- Achievement system
- Feedback system

*(To deploy Edge functions for email, use the Supabase CLI: `npx supabase functions deploy send-feedback-reply --project-ref YOUR_PROJECT_REF`)*

---

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── MainMenu.jsx      # Landing screen with all navigation
│   ├── DailyRewardModal.jsx  # Daily login reward popup
│   ├── NotificationBell.jsx  # Social notification bell
│   ├── FriendInviteModal.jsx # Real-time party invite toast
│   ├── PresenceDot.jsx   # Online status indicator
│   ├── PlayerCard.jsx    # Trainer card shown in lobbies
│   ├── FeedbackWidget.jsx    # Floating feedback button
│   └── ...
├── contexts/             # React Contexts (global state)
│   ├── AuthContext.jsx   # Auth state + game session saving
│   ├── SocialContext.jsx # Presence, notifications, activity
│   ├── DailyRewardContext.jsx  # Daily reward state + auto-popup
│   └── ...
├── pages/                # Full page components
│   ├── GamePage.jsx      # Singleplayer game
│   ├── MultiplayerGamePage.jsx  # Party match game
│   ├── HardcoreGamePage.jsx     # Hardcore mode
│   ├── DailyChallengePage.jsx   # Daily challenge
│   ├── RankedQueuePage.jsx      # Ranked matchmaking queue
│   ├── FriendsPage.jsx   # Social hub (4 tabs)
│   ├── FriendProfilePage.jsx    # Public trainer profiles
│   ├── WeeklyChallengePage.jsx  # Weekly challenge tracker
│   ├── ProfilePage.jsx   # Personal profile & stats
│   ├── PokedexPage.jsx   # Personal Pokédex
│   └── ...
├── hooks/                # Custom React hooks
│   └── useGameLogic.js   # Core game state machine
├── socialApi.js          # Social system DB operations
├── dailyReward.js        # Daily rewards API & schedule
├── weeklyChallenge.js    # Weekly challenge logic & shuffle
├── friendsApi.js         # Friends CRUD operations
├── achievements.js       # Achievement definitions & evaluator
├── utils.js              # XP/level/rank tier helpers
└── index.css             # Full design system (~4600 lines)
```

---

*Built by Kaushik & AI Assistant.*

# 🎲 Scrabble AI Arena

> **An advanced Scrabble implementation with AI opponents and experimental game variants designed to test and benchmark AI strategies**

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![AI](https://img.shields.io/badge/AI-Powered-FF6B6B?style=for-the-badge)

[Play Now](#-getting-started) • [Features](#-features) • [Variants](#-experimental-board-variants) • [Tech Stack](#-tech-stack)

</div>

---

## 🌟 What Makes This Special?

This isn't just another Scrabble clone. **Scrabble AI Arena** is a testing ground for AI strategies with:

- **🧪 Experimental Variants** - Modified rulesets to challenge AI decision-making
- **🤖 Multi-Difficulty AI** - Compare strategies across Easy/Medium/Hard opponents
- **📊 AI vs AI Mode** - Watch different difficulties compete for strategy analysis
- **⚡ Real-Time Validation** - SOWPODS dictionary with 267,751 words
- **🎯 Live Preview** - See score calculations before committing moves

## ✨ Features

### 🎮 Core Gameplay
- **Complete Scrabble Implementation** - Official rules with full tile bag
- **Drag & Drop Interface** - Smooth tile placement with `@dnd-kit`
- **Instant Validation** - Live preview shows validity and score in real-time
- **Smart Word Detection** - Validates all formed words including cross-words
- **Move History** - Track every play throughout the game

### 🤖 AI Opponents

Three distinct strategies for testing:

| Difficulty | Strategy | Use Case |
|-----------|----------|----------|
| **Easy** 🟢 | Random valid moves | Baseline testing |
| **Medium** 🟡 | Top 50% moves | Balanced gameplay |
| **Hard** 🔴 | Highest-scoring always | Maximum optimization |

**AI Features:**
- Validates all words (including cross-words) before playing
- Auto-resigns when stuck (no infinite loops!)
- Uses 74,414 words (2-7 letters) from SOWPODS
- Generates moves in ~100-500ms

### 🧪 Experimental Board Variants

**Test your AI's adaptability** with modified game boards:

#### 🟦 Standard
Classic Scrabble layout - the baseline for comparison

#### ⚡ Bonus Blitz
**2.5x more bonus squares** for aggressive scoring strategies
- Tests AI's ability to maximize multipliers
- Favors positional play over vocabulary

#### 🎲 Random
**Procedurally generated bonus placement** every game
- Eliminates memorized optimal positions
- Tests AI adaptability to unknown layouts
- Perfect for benchmarking robustness

#### ⚠️ Hazards
**Risk/reward gameplay** with dangerous squares
- Hazard squares **deduct 10 points**
- Forces strategic risk assessment
- Tests AI's ability to avoid penalties vs. chase bonuses

> 💡 **Pro Tip:** Use AI vs AI mode with different variants to compare how difficulty levels respond to rule changes!

### 🎯 Game Modes

- **👤 Human vs AI** - Classic gameplay
- **🤖 AI vs AI** - Watch and learn from AI strategies
  - Set different difficulties for each AI
  - Great for benchmarking and analysis

## 🚀 Getting Started

### Prerequisites
```bash
node --version  # v18.0.0 or higher
npm --version   # v9.0.0 or higher
```

### Quick Start

```bash
# Clone
git clone https://github.com/xerk-dot/scrabble_with_gemini_3.0.git
cd scrabble_with_gemini_3.0

# Install
npm install

# Run
npm run dev
```

**Open** → [http://localhost:3000](http://localhost:3000) 🎉

### Production Build

```bash
npm run build
npm start
```

## 🎮 How to Play

### 1️⃣ **Setup**
- Choose **game mode** (Human vs AI / AI vs AI)
- Select **board variant** to test
- Pick **AI difficulty** (or two for AI vs AI)
- Click **"New Game"**

### 2️⃣ **Make Moves**
- **Drag tiles** from rack to board
- **Live preview** shows validity ✓/✗ and score
- **Submit** to play or **Recall** to undo

### 3️⃣ **Actions**
| Button | Action |
|--------|--------|
| Submit | Play your word |
| Recall | Take back tiles |
| Shuffle | Reorganize rack |
| Pass | Skip turn |
| Resign | Give up (when stuck) |

### 4️⃣ **Win**
- **Highest score** when all players resign
- AI auto-resigns when no valid moves exist

## 🏗️ Tech Stack

- **Framework** → [Next.js 15](https://nextjs.org/) with App Router
- **Language** → TypeScript for type safety
- **UI** → React 18 with CSS Modules
- **Drag & Drop** → [@dnd-kit/core](https://dndkit.com/)
- **Validation** → Server Actions with SOWPODS
- **State** → React Context API

## 📊 AI Performance Notes

**Move Generation Speed:**
- Easy: ~50-150ms
- Medium: ~100-300ms  
- Hard: ~200-500ms

**Dictionary:**
- Full: 267,751 words (all lengths)
- AI Subset: 74,414 words (2-7 letters only)
- Format: SOWPODS (British + American)

**Validation:**
- Checks ALL formed words (including perpendiculars)
- No invalid words slip through
- Empty board handled correctly

## 🎯 Use Cases

### 🧪 AI Research
- Test how AI adapts to rule modifications
- Compare strategies across difficulty levels
- Benchmark performance on different board layouts

### 🎓 Learning Tool
- Watch AI gameplay to learn strategies
- See score calculations in real-time
- Understand word placement patterns

### 🎮 Just for Fun
- Play classic Scrabble with a smart AI
- Try experimental variants
- Challenge yourself on Hazards mode!

## 📁 Project Structure

```
src/
├── app/
│   ├── actions.ts          # 🔍 Word validation (Server Actions)
│   ├── ai-actions.ts       # 🤖 AI move generation
│   └── page.tsx            # 📄 Main page
├── components/
│   ├── Board.tsx           # 🎲 Game board
│   ├── Game.tsx            # 🎮 Game controller
│   ├── Rack.tsx            # 🎫 Tile rack
│   ├── Square.tsx          # ⬜ Board squares
│   └── Tile.tsx            # 🔠 Individual tiles
├── context/
│   └── GameContext.tsx     # 🔄 State management
└── lib/
    ├── constants.ts        # 📋 Board layouts, tile values
    ├── gameUtils.ts        # 🛠️ Board init, tile bag
    ├── scoring.ts          # 📊 Score calculation
    ├── types.ts            # 📝 TypeScript types
    └── validation.ts       # ✅ Move validation
```

## 🤝 Contributing

Built with [Google Gemini](https://deepmind.google/technologies/gemini/) assistance.

Contributions welcome! Feel free to:
- 🐛 Report bugs
- 💡 Suggest new variants
- 🚀 Submit PRs
- 📖 Improve docs

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- **SOWPODS Dictionary** - [jesstess/Scrabble](https://github.com/jesstess/Scrabble)
- **Inspiration** - Classic Scrabble by Hasbro
- **AI Assistant** - Google Gemini 2.0

---

<div align="center">

**Built to test AI strategies • Play to have fun** 🎲✨

[Report Bug](https://github.com/xerk-dot/scrabble_with_gemini_3.0/issues) • 
[Request Feature](https://github.com/xerk-dot/scrabble_with_gemini_3.0/issues)

</div>

# 🦶 BIGFOOT — Multiplayer Wilderness Survival

A real-time multiplayer survival horror game built with Node.js, Socket.io, and HTML5 Canvas.

## 🎮 Features

- **Multiplayer** — up to 8 hunters via real-time Socket.io
- **Bigfoot AI** — roams, chases, attacks; stunnable with muskets or bear traps
- **Darkness & Flashlights** — dynamic darkness with cone flashlight using Canvas compositing
- **Security Cameras** — 4 cabin cameras with green phosphor CRT effect & power system
- **Cabin** — lockable door (auto-closes after 8s), interior with windows
- **Muskets** — 6 shots, reload required; stun Bigfoot for 6 seconds
- **Bear Traps** — place them in Bigfoot's path; stun for 10 seconds
- **Food & Hunting** — deer, rabbit, berries, mushrooms scattered across the map
- **Building** — place wood walls to create barriers
- **Procedural Textures** — forest tiles, cabin floor, tree sprites, player sprites all generated in-canvas
- **Spatial Audio** — footsteps, musket shots, bigfoot roars, heartbeat when Bigfoot is near, wind ambience
- **Minimap** — live minimap showing all players, Bigfoot, food, and traps

## 🕹️ Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move |
| Mouse | Aim flashlight |
| Left Click | Shoot musket |
| E | Collect nearby food |
| R | Reload musket |
| T | Place bear trap |
| Q | Toggle cabin door |
| F | Toggle flashlight |
| C | Toggle camera panel |
| B | Build wall (click to place) |

## 🚀 Deploy on Render

### 1. Push to GitHub
```bash
cd bigfoot-game
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/bigfoot-game.git
git push -u origin main
```

### 2. Create Render Web Service
1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name**: `bigfoot-survival`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or Starter for better performance)
4. Click **Create Web Service**

### 3. Environment Variables (optional)
| Key | Value |
|-----|-------|
| `PORT` | Render sets this automatically |
| `NODE_ENV` | `production` |

### 4. Share your URL
Render gives you a URL like `https://bigfoot-survival.onrender.com` — share it with friends!

> **Note**: Free Render instances sleep after 15 min of inactivity. Upgrade to Starter ($7/mo) for always-on multiplayer.

## 🗺️ Map Layout

- **Map size**: 3200×3200 pixels
- **Cabin**: center of map ~(1500, 1500)
- **Trees**: 400 randomly placed (avoiding cabin)
- **Food**: 20 items scattered, respawn after 30 seconds
- **Bigfoot**: starts at (1800, 1800), wanders entire map

## 🛠️ Local Development

```bash
npm install
npm start
# Open http://localhost:3000
```

## 🔧 Tuning

Edit `server.js` to adjust:
- `bf.speed` — Bigfoot movement speed
- `bf.alertRadius` — when Bigfoot notices players
- `bf.stunTimer` — how long stuns last
- `cb.doorTimer` — auto-close door delay
- Food healing values in `collect_food` event
- `TREES` count in client for performance

## 📦 Stack

- **Server**: Node.js + Express + Socket.io
- **Client**: Vanilla HTML5 Canvas + Web Audio API
- **No build tools needed** — pure JavaScript

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Serve client.html from root — same pattern as voxolcraft
const clientPath = path.join(__dirname, 'index.html');
app.get('/', (req, res) => {
  if (fs.existsSync(clientPath)) {
    res.sendFile(clientPath);
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.send(HTML);
  }
});

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BIGFOOT — Multiplayer Survival</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:wght@400;700&display=swap');

  * { margin:0; padding:0; box-sizing:border-box; }

  body {
    background: #0a0805;
    color: #c8b89a;
    font-family: 'Courier Prime', monospace;
    overflow: hidden;
    user-select: none;
  }

  #screen { position:relative; width:100vw; height:100vh; }

  /* ── Join Screen ── */
  #join-screen {
    position:absolute; inset:0;
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    background: radial-gradient(ellipse at center, #0d1a0a 0%, #030805 70%);
    z-index:100;
  }
  #join-screen h1 {
    font-family: 'Special Elite', cursive;
    font-size: clamp(2.5rem,7vw,5rem);
    color: #e8d5a3;
    text-shadow: 0 0 40px #4a3a1a, 0 0 80px #2a1a08;
    letter-spacing:0.15em;
    margin-bottom:0.3em;
  }
  #join-screen .subtitle {
    color:#7a6a4a; font-size:1rem; letter-spacing:0.3em;
    text-transform:uppercase; margin-bottom:3rem;
  }
  .bigfoot-silhouette {
    font-size:5rem; filter:drop-shadow(0 0 20px #3a2a1a);
    margin-bottom:2rem; animation: breathe 3s ease-in-out infinite;
  }
  @keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
  #name-input {
    background:#0d1a0a; border:2px solid #4a3a1a;
    color:#e8d5a3; padding:0.8em 1.5em;
    font-family:'Courier Prime',monospace; font-size:1.1rem;
    width:280px; text-align:center; margin-bottom:1rem;
    outline:none; letter-spacing:0.1em;
    transition: border-color 0.3s;
  }
  #name-input:focus { border-color:#8a6a3a; }
  #name-input::placeholder { color:#3a3028; }
  #join-btn {
    background: #1a2a0f; border:2px solid #4a7a2a;
    color:#8acd4a; padding:0.8em 2.5em;
    font-family:'Special Elite',cursive; font-size:1.2rem;
    cursor:pointer; letter-spacing:0.2em;
    transition: all 0.3s;
  }
  #join-btn:hover { background:#2a3a1f; border-color:#6ab03a; color:#aafa6a; }
  .instructions {
    margin-top:2.5rem; color:#4a3a2a; font-size:0.78rem;
    text-align:center; line-height:2; letter-spacing:0.05em;
  }
  .instructions span { color:#7a6a4a; }

  /* ── Game Canvas ── */
  #game-canvas {
    display:none; width:100%; height:100%;
    image-rendering: pixelated;
  }

  /* ── HUD ── */
  #hud {
    display:none; position:absolute; inset:0;
    pointer-events:none;
  }

  /* Stat bars */
  .stat-bar-wrap {
    position:absolute; bottom:20px; left:20px;
    display:flex; flex-direction:column; gap:6px;
    pointer-events:none;
  }
  .stat-bar { display:flex; align-items:center; gap:8px; }
  .stat-bar label { width:65px; font-size:0.7rem; color:#9a8a6a; letter-spacing:0.1em; text-transform:uppercase; }
  .bar-bg { width:150px; height:10px; background:#0a0a0a; border:1px solid #2a2a1a; }
  .bar-fill { height:100%; transition:width 0.3s; }
  #hp-fill { background: linear-gradient(90deg,#6a1a1a,#e03030); }
  #hunger-fill { background: linear-gradient(90deg,#3a2a0a,#c08030); }
  #stamina-fill { background: linear-gradient(90deg,#0a2a3a,#30a0c0); }

  /* Ammo & Items */
  .inventory {
    position:absolute; bottom:20px; right:20px;
    display:flex; flex-direction:column; align-items:flex-end; gap:6px;
    pointer-events: none;
  }
  .inv-item {
    display:flex; align-items:center; gap:8px;
    color:#c8b89a; font-size:0.8rem;
  }
  .inv-icon { font-size:1.2rem; }

  /* Log */
  #game-log {
    position:absolute; top:20px; left:20px;
    max-width:360px; pointer-events:none;
  }
  .log-entry {
    background:rgba(0,0,0,0.7); border-left:2px solid #4a3a1a;
    padding:4px 10px; font-size:0.72rem; color:#a09070;
    margin-bottom:3px; letter-spacing:0.05em;
    animation: logfade 0.3s ease;
  }
  @keyframes logfade { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }

  /* Minimap */
  #minimap-canvas {
    position:absolute; top:20px; right:20px;
    border:2px solid #3a2a1a;
    image-rendering:pixelated;
    pointer-events:none;
  }
  #minimap-label {
    position:absolute; top:148px; right:20px;
    font-size:0.6rem; color:#4a3a2a; letter-spacing:0.15em;
    pointer-events:none;
  }

  /* Camera panel */
  #cam-panel {
    position:absolute; bottom:20px; left:50%;
    transform:translateX(-50%);
    background:rgba(0,0,0,0.85); border:2px solid #2a4a1a;
    padding:8px; display:none; flex-direction:column; align-items:center; gap:6px;
    pointer-events:all;
  }
  #cam-canvas { border:1px solid #1a3a0a; image-rendering:pixelated; }
  .cam-buttons { display:flex; gap:4px; }
  .cam-btn {
    background:#0d1a0a; border:1px solid #2a4a1a;
    color:#6aaa3a; padding:3px 8px; font-size:0.65rem;
    font-family:'Courier Prime',monospace; cursor:pointer;
    letter-spacing:0.1em;
  }
  .cam-btn:hover, .cam-btn.active { background:#1a3a0f; color:#aafa6a; }
  #cam-label { font-size:0.65rem; color:#3a5a2a; letter-spacing:0.15em; }
  #power-bar-wrap { display:flex; align-items:center; gap:6px; }
  #power-bar-wrap label { font-size:0.65rem; color:#6a8a4a; }
  #power-bar { width:100px; height:6px; background:#0a0a0a; border:1px solid #2a3a1a; }
  #power-fill { height:100%; background:linear-gradient(90deg,#1a4a1a,#4aaa2a); transition:width 0.5s; }

  /* Action buttons */
  #actions {
    position:absolute; bottom:20px; left:50%;
    transform:translateX(-50%);
    display:flex; gap:8px; pointer-events:all;
  }
  .action-btn {
    background:rgba(0,0,0,0.8); border:2px solid #3a2a1a;
    color:#c8b89a; padding:8px 14px; font-family:'Courier Prime',monospace;
    font-size:0.75rem; cursor:pointer; letter-spacing:0.1em;
    transition:all 0.2s; display:flex; flex-direction:column;
    align-items:center; gap:2px;
  }
  .action-btn:hover { border-color:#7a5a2a; background:rgba(20,12,4,0.9); }
  .action-btn .key { color:#5a4a3a; font-size:0.6rem; }

  /* Door indicator */
  #door-indicator {
    position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
    color:#e0c060; font-family:'Special Elite',cursive; font-size:1.5rem;
    text-shadow:0 0 20px #a09030; letter-spacing:0.2em;
    display:none; animation:doorpulse 0.5s ease-in-out;
    pointer-events:none;
  }
  @keyframes doorpulse { from{opacity:0;transform:translate(-50%,-50%) scale(0.8)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }

  /* Bigfoot warning */
  #bf-warning {
    position:absolute; top:0; left:0; right:0;
    height:8px;
    background:transparent;
    pointer-events:none;
    transition:background 0.5s;
  }

  /* Dead screen */
  #dead-screen {
    position:absolute; inset:0;
    background:rgba(80,0,0,0.6);
    display:none; flex-direction:column;
    align-items:center; justify-content:center;
    z-index:50;
    pointer-events:all;
  }
  #dead-screen h2 {
    font-family:'Special Elite',cursive; font-size:3rem;
    color:#e03030; text-shadow:0 0 30px #800000;
    margin-bottom:1rem;
  }
  #respawn-btn {
    background:#1a0a0a; border:2px solid #5a1a1a;
    color:#c04040; padding:0.8em 2em;
    font-family:'Courier Prime',monospace; cursor:pointer;
    font-size:1rem; transition:all 0.3s;
  }
  #respawn-btn:hover { background:#2a0f0f; border-color:#9a3030; }

  /* Tooltip */
  #tooltip {
    position:absolute; display:none;
    background:rgba(0,0,0,0.85); border:1px solid #3a2a1a;
    color:#a09070; padding:4px 10px; font-size:0.7rem;
    pointer-events:none; letter-spacing:0.05em;
  }

  /* Compass */
  #compass {
    position:absolute; top:170px; right:30px;
    font-size:0.65rem; color:#5a4a3a; letter-spacing:0.1em;
    pointer-events:none; text-align:center;
  }
</style>
</head>
<body>
<div id="screen">

  <!-- Join Screen -->
  <div id="join-screen">
    <div class="bigfoot-silhouette">🦶</div>
    <h1>BIGFOOT</h1>
    <div class="subtitle">Multiplayer Wilderness Survival</div>
    <input id="name-input" type="text" maxlength="16" placeholder="Enter your hunter name...">
    <button id="join-btn">ENTER THE FOREST</button>
    <div class="instructions">
      <span>WASD</span> Move &nbsp;|&nbsp; <span>Mouse</span> Aim flashlight<br>
      <span>Click</span> Shoot musket &nbsp;|&nbsp; <span>E</span> Interact / collect<br>
      <span>T</span> Place bear trap &nbsp;|&nbsp; <span>F</span> Toggle flashlight<br>
      <span>R</span> Reload &nbsp;|&nbsp; <span>C</span> Camera console &nbsp;|&nbsp; <span>Q</span> Open/close door<br>
      <span>B</span> Build wall &nbsp;|&nbsp; Survive the night together!
    </div>
  </div>

  <!-- Game Canvas -->
  <canvas id="game-canvas"></canvas>

  <!-- HUD -->
  <div id="hud">
    <div id="bf-warning"></div>

    <!-- Log -->
    <div id="game-log"></div>

    <!-- Minimap -->
    <canvas id="minimap-canvas" width="128" height="128"></canvas>
    <div id="minimap-label">▲ NORTH</div>
    <div id="compass"></div>

    <!-- Stat bars -->
    <div class="stat-bar-wrap">
      <div class="stat-bar">
        <label>❤ Health</label>
        <div class="bar-bg"><div class="bar-fill" id="hp-fill" style="width:100%"></div></div>
      </div>
      <div class="stat-bar">
        <label>🍖 Hunger</label>
        <div class="bar-bg"><div class="bar-fill" id="hunger-fill" style="width:100%"></div></div>
      </div>
      <div class="stat-bar">
        <label>⚡ Stamina</label>
        <div class="bar-bg"><div class="bar-fill" id="stamina-fill" style="width:100%"></div></div>
      </div>
    </div>

    <!-- Inventory -->
    <div class="inventory">
      <div class="inv-item"><span id="ammo-count">6</span> × <span class="inv-icon">🔫</span> Musket</div>
      <div class="inv-item"><span id="trap-count">3</span> × <span class="inv-icon">🪤</span> Bear Trap</div>
    </div>

    <!-- Camera panel -->
    <div id="cam-panel">
      <div id="cam-label">📹 SECURITY CAMERA</div>
      <canvas id="cam-canvas" width="240" height="135"></canvas>
      <div class="cam-buttons">
        <button class="cam-btn active" onclick="switchCam(0)">CAM 1</button>
        <button class="cam-btn" onclick="switchCam(1)">CAM 2</button>
        <button class="cam-btn" onclick="switchCam(2)">CAM 3</button>
        <button class="cam-btn" onclick="switchCam(3)">CAM 4</button>
      </div>
      <div id="power-bar-wrap">
        <label>POWER</label>
        <div id="power-bar"><div id="power-fill" style="width:100%"></div></div>
      </div>
    </div>

    <!-- Door indicator -->
    <div id="door-indicator">🚪 DOOR OPEN</div>

    <!-- Actions -->
    <div id="actions">
      <button class="action-btn" onclick="doShoot()">🔫 Shoot<span class="key">CLICK</span></button>
      <button class="action-btn" onclick="doReload()">🔄 Reload<span class="key">R</span></button>
      <button class="action-btn" onclick="doTrap()">🪤 Trap<span class="key">T</span></button>
      <button class="action-btn" onclick="doBuild()">🔨 Build<span class="key">B</span></button>
      <button class="action-btn" onclick="toggleDoor()">🚪 Door<span class="key">Q</span></button>
      <button class="action-btn" onclick="toggleFlashlight()">🔦 Light<span class="key">F</span></button>
      <button class="action-btn" onclick="toggleCam()">📹 Cams<span class="key">C</span></button>
    </div>

    <!-- Dead Screen -->
    <div id="dead-screen">
      <h2>YOU WERE TAKEN</h2>
      <p style="margin-bottom:2rem; color:#8a5050; font-size:0.9rem">Bigfoot claimed another victim...</p>
      <button id="respawn-btn" onclick="doRespawn()">↺ RESPAWN</button>
    </div>

    <div id="tooltip"></div>
  </div>

</div>

<script src="/socket.io/socket.io.js"></script>
<script>
// ══════════════════════════════════════════════════════
//  BIGFOOT SURVIVAL — CLIENT
// ══════════════════════════════════════════════════════

const socket = io();
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const mmCanvas = document.getElementById('minimap-canvas');
const mmCtx = mmCanvas.getContext('2d');
const camCanvas = document.getElementById('cam-canvas');
const camCtx = camCanvas.getContext('2d');

let myId = null, myName = 'Hunter';
let state = null;
let MAP_W = 3200, MAP_H = 3200;
const TILE = 64;

// Input state
const keys = {};
let mouseX = 0, mouseY = 0;
let camMode = false;
let buildMode = false;

// Camera viewport
const cam = { x: 1500, y: 1550 };

// ── Textures (procedural) ──────────────────────────────
const texCache = {};

function makeForestTile(seed) {
  const oc = document.createElement('canvas');
  oc.width = oc.height = TILE;
  const oc2 = oc.getContext('2d');
  // Base dark ground
  const base = seed % 3 === 0 ? '#0d1a08' : seed % 3 === 1 ? '#0b1806' : '#0e1c09';
  oc2.fillStyle = base;
  oc2.fillRect(0,0,TILE,TILE);
  // Noise patches
  const rng = mulberry32(seed);
  for (let i=0; i<18; i++) {
    const r = rng(), g = rng(), b = rng(), s = rng();
    oc2.fillStyle = \`rgba(\${10+r*15},\${25+g*20},\${8+b*10},\${0.3+s*0.4})\`;
    oc2.beginPath();
    oc2.arc(rng()*TILE, rng()*TILE, 3+rng()*8, 0, Math.PI*2);
    oc2.fill();
  }
  return oc;
}

function makeDirtTile() {
  const oc = document.createElement('canvas');
  oc.width = oc.height = TILE;
  const oc2 = oc.getContext('2d');
  oc2.fillStyle = '#1a1208';
  oc2.fillRect(0,0,TILE,TILE);
  const rng = mulberry32(7);
  for (let i=0; i<20; i++) {
    oc2.fillStyle = \`rgba(\${30+rng()*20},\${20+rng()*15},\${8+rng()*10},0.4)\`;
    oc2.fillRect(rng()*TILE, rng()*TILE, 2+rng()*6, 2+rng()*4);
  }
  return oc;
}

function makeCabinTexture() {
  const oc = document.createElement('canvas');
  oc.width = 256; oc.height = 192;
  const oc2 = oc.getContext('2d');
  // Floor
  oc2.fillStyle = '#1a1008';
  oc2.fillRect(0,0,256,192);
  // Planks
  for (let y=0; y<192; y+=16) {
    oc2.strokeStyle = '#0d0804';
    oc2.lineWidth = 1;
    oc2.beginPath(); oc2.moveTo(0,y); oc2.lineTo(256,y); oc2.stroke();
    const off = (Math.floor(y/16) % 2) * 48;
    for (let x=-off; x<256+64; x+=64) {
      oc2.strokeStyle = '#0c0703';
      oc2.beginPath(); oc2.moveTo(x,y); oc2.lineTo(x,y+16); oc2.stroke();
      // Wood grain
      oc2.strokeStyle = 'rgba(40,20,5,0.2)';
      oc2.beginPath(); oc2.moveTo(x+5,y+2); oc2.lineTo(x+55,y+14); oc2.stroke();
    }
  }
  // Walls
  oc2.strokeStyle = '#2a1a08';
  oc2.lineWidth = 8;
  oc2.strokeRect(4,4,248,184);
  // Windows
  [[30,20,50,40],[176,20,50,40],[30,130,50,40],[176,130,50,40]].forEach(([x,y,w,h]) => {
    oc2.fillStyle = '#060e15';
    oc2.fillRect(x,y,w,h);
    oc2.strokeStyle = '#3a2a10'; oc2.lineWidth=2;
    oc2.strokeRect(x,y,w,h);
    oc2.strokeStyle='rgba(30,50,70,0.3)';
    oc2.lineWidth=1;
    oc2.beginPath(); oc2.moveTo(x+w/2,y); oc2.lineTo(x+w/2,y+h); oc2.stroke();
    oc2.beginPath(); oc2.moveTo(x,y+h/2); oc2.lineTo(x+w,y+h/2); oc2.stroke();
  });
  return oc;
}

function makeTreeSprite(seed) {
  const oc = document.createElement('canvas');
  oc.width = 60; oc.height = 80;
  const oc2 = oc.getContext('2d');
  const rng = mulberry32(seed);
  // Trunk
  oc2.fillStyle = \`hsl(\${20+rng()*10},\${30+rng()*20}%,\${8+rng()*8}%)\`;
  oc2.fillRect(22,50,16,30);
  // Canopy layers
  const g = rng()*30+130;
  for (let i=0; i<3; i++) {
    oc2.fillStyle = \`rgba(\${10+rng()*15},\${g-i*20},\${5+rng()*10},0.95)\`;
    oc2.beginPath();
    oc2.arc(30, 35-i*10, 18-i*2, 0, Math.PI*2);
    oc2.fill();
  }
  return oc;
}

function makeBigfootSprite() {
  const oc = document.createElement('canvas');
  oc.width=60; oc.height=80;
  const oc2 = oc.getContext('2d');
  // Body
  oc2.fillStyle='#2a1a0a';
  oc2.beginPath(); oc2.ellipse(30,45,18,28,0,0,Math.PI*2); oc2.fill();
  // Head
  oc2.beginPath(); oc2.ellipse(30,18,14,16,0,0,Math.PI*2); oc2.fill();
  // Eyes
  oc2.fillStyle='#cc2200';
  oc2.beginPath(); oc2.arc(24,16,3,0,Math.PI*2); oc2.fill();
  oc2.beginPath(); oc2.arc(36,16,3,0,Math.PI*2); oc2.fill();
  // Hair texture
  oc2.strokeStyle='#1a1008'; oc2.lineWidth=1;
  for (let i=0;i<12;i++) {
    oc2.beginPath();
    oc2.moveTo(12+i*3,40); oc2.lineTo(12+i*3+2,65);
    oc2.stroke();
  }
  return oc;
}

function makePlayerSprite(color) {
  const oc = document.createElement('canvas');
  oc.width=32; oc.height=40;
  const oc2 = oc.getContext('2d');
  // Body
  oc2.fillStyle='#3a2a1a'; oc2.fillRect(8,14,16,18);
  // Head
  oc2.fillStyle='#c8a070'; oc2.beginPath(); oc2.arc(16,10,9,0,Math.PI*2); oc2.fill();
  // Hat
  oc2.fillStyle='#2a1808';
  oc2.fillRect(6,2,20,5);
  oc2.fillRect(8,0,16,5);
  // Color indicator
  oc2.fillStyle=color||'#4fc3f7';
  oc2.fillRect(8,14,16,4);
  // Gun
  oc2.fillStyle='#4a3a20'; oc2.fillRect(22,14,12,3);
  return oc;
}

function mulberry32(a) {
  return function() {
    a|=0; a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}

// Pregenerate tiles
const forestTiles = [0,1,2].map(i => makeForestTile(i*137+42));
const dirtTile = makeDirtTile();
const cabinTex = makeCabinTexture();
const bfSprite = makeBigfootSprite();
let playerSprites = {};

// Pre-generate trees with fixed positions
const TREES = [];
const treeRng = mulberry32(9999);
for (let i=0; i<400; i++) {
  const x = treeRng()*MAP_W, y = treeRng()*MAP_H;
  // Avoid cabin area
  if (x>1350 && x<1850 && y>1350 && y<1850) continue;
  TREES.push({ x, y, sprite: makeTreeSprite(i) });
}

// ── Audio Engine ──────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type, vol=0.5, x=null, y=null) {
  ensureAudio();
  const me = state?.players?.[myId];
  let spatialVol = vol;
  if (x !== null && me) {
    const d = Math.hypot(x-me.x, y-me.y);
    spatialVol = Math.max(0, vol * (1 - d/800));
    if (spatialVol < 0.01) return;
  }

  const g = audioCtx.createGain();
  g.gain.setValueAtTime(spatialVol, audioCtx.currentTime);
  g.connect(audioCtx.destination);

  const osc = audioCtx.createOscillator();
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.8, audioCtx.sampleRate);
  const data = buf.getChannelData(0);

  switch(type) {
    case 'shoot': {
      // Musket bang
      for (let i=0; i<data.length; i++) {
        const t = i/audioCtx.sampleRate;
        data[i] = (Math.random()*2-1) * Math.exp(-t*18) * 1.2;
      }
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      // Low-pass for warmth
      const lpf = audioCtx.createBiquadFilter();
      lpf.type='lowpass'; lpf.frequency.value=600;
      src.connect(lpf); lpf.connect(g);
      src.start(); return;
    }
    case 'bigfoot_roar': {
      const buf2 = audioCtx.createBuffer(1, audioCtx.sampleRate*1.5, audioCtx.sampleRate);
      const d2 = buf2.getChannelData(0);
      for (let i=0; i<d2.length; i++) {
        const t = i/audioCtx.sampleRate;
        const freq = 80 + Math.sin(t*3)*30;
        d2[i] = Math.sin(t*freq*Math.PI*2) * 0.5 * Math.exp(-t*1.5)
               + (Math.random()*2-1)*0.3*Math.exp(-t*2);
      }
      const src = audioCtx.createBufferSource();
      src.buffer = buf2; src.connect(g); src.start(); return;
    }
    case 'trap': {
      const buf2 = audioCtx.createBuffer(1, audioCtx.sampleRate*0.3, audioCtx.sampleRate);
      const d2 = buf2.getChannelData(0);
      for (let i=0; i<d2.length; i++) {
        const t = i/audioCtx.sampleRate;
        d2[i] = (Math.random()*2-1)*Math.exp(-t*25)*0.8
               + Math.sin(t*800*Math.PI*2)*Math.exp(-t*30)*0.4;
      }
      const src = audioCtx.createBufferSource();
      src.buffer=buf2; src.connect(g); src.start(); return;
    }
    case 'footstep': {
      const buf2 = audioCtx.createBuffer(1, audioCtx.sampleRate*0.08, audioCtx.sampleRate);
      const d2 = buf2.getChannelData(0);
      for (let i=0; i<d2.length; i++) {
        const t = i/audioCtx.sampleRate;
        d2[i] = (Math.random()*2-1)*Math.exp(-t*60)*0.3;
      }
      const src = audioCtx.createBufferSource();
      src.buffer=buf2; src.connect(g); src.start(); return;
    }
    case 'heartbeat': {
      const buf2 = audioCtx.createBuffer(1, audioCtx.sampleRate*0.4, audioCtx.sampleRate);
      const d2 = buf2.getChannelData(0);
      for (let i=0; i<d2.length; i++) {
        const t = i/audioCtx.sampleRate;
        d2[i] = (Math.sin(t*200*Math.PI*2)*Math.exp(-t*25) + Math.sin((t-0.05)*180*Math.PI*2)*Math.exp(-(t-0.05)*25)*0.8) * 0.4;
      }
      const src = audioCtx.createBufferSource();
      src.buffer=buf2; src.connect(g); src.start(); return;
    }
    case 'door': {
      const buf2 = audioCtx.createBuffer(1, audioCtx.sampleRate*0.6, audioCtx.sampleRate);
      const d2 = buf2.getChannelData(0);
      for (let i=0; i<d2.length; i++) {
        const t = i/audioCtx.sampleRate;
        d2[i] = (Math.random()*2-1) * Math.exp(-t*5) * 0.3 + Math.sin(t*60*Math.PI*2)*Math.exp(-t*4)*0.2;
      }
      const src = audioCtx.createBufferSource();
      src.buffer=buf2; src.connect(g); src.start(); return;
    }
    case 'wind': {
      const buf2 = audioCtx.createBuffer(1, audioCtx.sampleRate*2, audioCtx.sampleRate);
      const d2 = buf2.getChannelData(0);
      for (let i=0; i<d2.length; i++) {
        d2[i] = (Math.random()*2-1)*0.08;
      }
      const src = audioCtx.createBufferSource();
      src.buffer=buf2;
      const bpf = audioCtx.createBiquadFilter();
      bpf.type='bandpass'; bpf.frequency.value=300; bpf.Q.value=0.5;
      src.connect(bpf); bpf.connect(g); src.start(); return;
    }
  }
}

// Ambient wind loop
let windPlaying = false;
function startAmbient() {
  if (windPlaying) return;
  windPlaying = true;
  function loop() {
    playSound('wind', 0.15);
    setTimeout(loop, 2000);
  }
  setTimeout(loop, 500);
}

// Footstep timer
let footstepTimer = 0;
let heartbeatTimer = 0;
let lastRoarTime = 0;

// ── Join ───────────────────────────────────────────────
document.getElementById('join-btn').onclick = joinGame;
document.getElementById('name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') joinGame();
});

function joinGame() {
  myName = document.getElementById('name-input').value.trim() || 'Hunter';
  socket.emit('join', { name: myName });
  ensureAudio();
  startAmbient();
}

socket.on('joined', ({ id, mapW, mapH }) => {
  myId = id;
  MAP_W = mapW; MAP_H = mapH;
  document.getElementById('join-screen').style.display = 'none';
  canvas.style.display = 'block';
  document.getElementById('hud').style.display = 'block';
  resizeCanvas();
  requestAnimationFrame(render);
});

// ── Resize ─────────────────────────────────────────────
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

// ── State updates ──────────────────────────────────────
socket.on('state', s => { state = s; updateHUD(); });
socket.on('log', msg => addLogEntry(msg));
socket.on('bigfoot_stunned', ({ x, y }) => {
  playSound('trap', 0.7, x, y);
  playSound('bigfoot_roar', 0.6, x, y);
  showTooltip('BIGFOOT STUNNED!', canvas.width/2, canvas.height/2-40, 2000);
});
socket.on('trap_triggered', ({ x, y }) => {
  playSound('trap', 0.8, x, y);
  addLogEntry('🪤 Bear trap triggered!');
});
socket.on('shot_fired', ({ x, y, angle }) => {
  playSound('shoot', 0.7, x, y);
});
socket.on('door_opened', () => {
  playSound('door', 0.5);
  const di = document.getElementById('door-indicator');
  di.textContent = '🚪 DOOR OPEN';
  di.style.display = 'block';
  setTimeout(() => di.style.display='none', 2000);
});
socket.on('door_closed', () => {
  playSound('door', 0.4);
  const di = document.getElementById('door-indicator');
  di.textContent = '🔒 DOOR LOCKED';
  di.style.color = '#60e060';
  di.style.display = 'block';
  setTimeout(() => { di.style.display='none'; di.style.color=''; }, 2000);
});
socket.on('player_dead', () => {
  document.getElementById('dead-screen').style.display = 'flex';
  playSound('bigfoot_roar', 0.9);
});
socket.on('food_collected', ({ foodId }) => {});
socket.on('food_respawned', (food) => {
  if (state) {
    const idx = state.food.findIndex(f => f.id === food.id);
    if (idx>=0) state.food[idx] = food;
  }
});
socket.on('structure_built', s => {
  if (state) state.structures.push(s);
});

// ── Input ──────────────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  switch(e.key.toLowerCase()) {
    case 'f': toggleFlashlight(); break;
    case 'r': doReload(); break;
    case 't': doTrap(); break;
    case 'q': toggleDoor(); break;
    case 'c': toggleCam(); break;
    case 'b': buildMode = !buildMode; showTooltip(buildMode?'BUILD MODE ON — click to place wall':'Build mode off', canvas.width/2, 100, 1500); break;
    case 'e': tryCollectFood(); break;
  }
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
canvas.addEventListener('click', e => {
  ensureAudio();
  if (buildMode) {
    const wx = cam.x + (e.clientX - canvas.width/2);
    const wy = cam.y + (e.clientY - canvas.height/2);
    socket.emit('build', { x: wx, y: wy, type: 'wall' });
    buildMode = false;
  } else {
    doShoot(e);
  }
});

// ── Actions ────────────────────────────────────────────
function doShoot(e) {
  if (!myId || !state) return;
  const me = state.players[myId];
  if (!me || !me.alive) return;
  const wx = cam.x + (mouseX - canvas.width/2);
  const wy = cam.y + (mouseY - canvas.height/2);
  const angle = Math.atan2(wy - me.y, wx - me.x);
  socket.emit('shoot', { angle });
}
function doReload() { socket.emit('reload'); }
function doTrap() {
  if (!state || !myId) return;
  const me = state.players[myId];
  if (!me) return;
  socket.emit('place_trap', { x: me.x + 40, y: me.y + 40 });
}
function doBuild() { buildMode = !buildMode; }
function toggleDoor() { socket.emit('toggle_door'); }
function toggleFlashlight() { socket.emit('toggle_flashlight'); }
function toggleCam() {
  camMode = !camMode;
  document.getElementById('cam-panel').style.display = camMode ? 'flex' : 'none';
  document.getElementById('actions').style.bottom = camMode ? '200px' : '20px';
}
function doRespawn() {
  socket.emit('respawn');
  document.getElementById('dead-screen').style.display = 'none';
}
function switchCam(id) {
  socket.emit('switch_camera', { camId: id });
  document.querySelectorAll('.cam-btn').forEach((b,i) => b.classList.toggle('active', i===id));
}
function tryCollectFood() {
  if (!state || !myId) return;
  const me = state.players[myId];
  if (!me) return;
  for (const food of state.food) {
    if (!food.alive) continue;
    const d = Math.hypot(food.x-me.x, food.y-me.y);
    if (d < 70) { socket.emit('collect_food', { foodId: food.id }); break; }
  }
}

// ── HUD Updates ────────────────────────────────────────
function updateHUD() {
  if (!state || !myId) return;
  const me = state.players[myId];
  if (!me) return;

  document.getElementById('hp-fill').style.width = me.hp + '%';
  document.getElementById('hunger-fill').style.width = me.hunger + '%';
  document.getElementById('stamina-fill').style.width = (me.stamina||100) + '%';
  document.getElementById('ammo-count').textContent = me.ammo ?? 6;
  document.getElementById('trap-count').textContent = me.trapsCarried ?? 3;
  document.getElementById('power-fill').style.width = (state.cabin?.power??100) + '%';

  // Bigfoot warning
  const bf = state.bigfoot;
  const bfDist = Math.hypot(bf.x-me.x, bf.y-me.y);
  const warn = document.getElementById('bf-warning');
  if (bfDist < 300) {
    const intensity = (1 - bfDist/300);
    warn.style.background = \`rgba(180,0,0,\${intensity*0.7})\`;
    warn.style.boxShadow = \`0 0 \${intensity*40}px rgba(200,0,0,0.8)\`;
    // Heartbeat
    if (Date.now() - heartbeatTimer > 800 - intensity*400) {
      heartbeatTimer = Date.now();
      playSound('heartbeat', intensity*0.4);
    }
    // Bigfoot roar occasionally
    if (bfDist < 150 && Date.now() - lastRoarTime > 8000) {
      lastRoarTime = Date.now();
      playSound('bigfoot_roar', 0.5, bf.x, bf.y);
    }
  } else {
    warn.style.background = 'transparent';
    warn.style.boxShadow = 'none';
  }

  // Camera view render
  if (camMode) renderCamView();
}

function addLogEntry(msg) {
  const log = document.getElementById('game-log');
  const el = document.createElement('div');
  el.className = 'log-entry';
  el.textContent = msg;
  log.prepend(el);
  while (log.children.length > 6) log.removeChild(log.lastChild);
}

function showTooltip(msg, x, y, dur=1500) {
  const t = document.getElementById('tooltip');
  t.textContent = msg;
  t.style.left = (x-t.offsetWidth/2)+'px';
  t.style.top = y+'px';
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.style.display='none', dur);
}

// ── Render Camera ──────────────────────────────────────
function renderCamView() {
  if (!state) return;
  const camId = state.cabin.activeCam;
  const camDef = state.cabin.cameras?.[camId];
  if (!camDef) return;

  camCtx.fillStyle = '#050a03';
  camCtx.fillRect(0,0,240,135);

  // Green phosphor effect
  camCtx.save();
  const scale = 240/400;
  camCtx.scale(scale, scale);
  const ox = camDef.x - 200, oy = camDef.y - 150;

  camCtx.fillStyle = '#050a03';
  camCtx.fillRect(0,0,400,270);

  // Render forest patch visible from this cam
  for (let tx=0; tx<400; tx+=TILE) {
    for (let ty=0; ty<270; ty+=TILE) {
      const tile = forestTiles[(Math.floor((ox+tx)/TILE) + Math.floor((oy+ty)/TILE)) % 3];
      camCtx.drawImage(tile, tx, ty);
    }
  }

  // Draw cabin interior
  const cb = state.cabin;
  camCtx.fillStyle='rgba(15,8,3,0.5)';
  camCtx.fillRect(cb.x-ox, cb.y-oy, cb.w, cb.h);

  // Draw players on cam
  for (const [id, p] of Object.entries(state.players)) {
    if (!p.alive) continue;
    const px = p.x-ox, py = p.y-oy;
    if (px<-20||px>420||py<-20||py>290) continue;
    camCtx.fillStyle = p.color||'#4fc3f7';
    camCtx.beginPath(); camCtx.arc(px,py,6,0,Math.PI*2); camCtx.fill();
  }

  // Draw bigfoot on cam (greenish blob)
  const bf = state.bigfoot;
  const bx = bf.x-ox, by = bf.y-oy;
  if (bx>-20&&bx<420&&by>-20&&by<290) {
    camCtx.fillStyle = bf.state==='stunned'?'#aa4400':'#1a3300';
    camCtx.beginPath(); camCtx.arc(bx,by,15,0,Math.PI*2); camCtx.fill();
    camCtx.fillStyle='#cc2200';
    camCtx.beginPath(); camCtx.arc(bx-5,by-5,3,0,Math.PI*2); camCtx.fill();
    camCtx.beginPath(); camCtx.arc(bx+5,by-5,3,0,Math.PI*2); camCtx.fill();
  }

  camCtx.restore();

  // Scanlines
  camCtx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y=0; y<135; y+=2) { camCtx.fillRect(0,y,240,1); }
  // Green tint overlay
  camCtx.fillStyle = 'rgba(0,80,0,0.12)';
  camCtx.fillRect(0,0,240,135);
  // Noise
  if (Math.random()>0.9) {
    camCtx.fillStyle = \`rgba(0,150,0,\${Math.random()*0.08})\`;
    camCtx.fillRect(0,Math.random()*135,240,1+Math.random()*3);
  }
  // Power flicker
  if ((state.cabin.power||100) < 30 && Math.random()>0.85) {
    camCtx.fillStyle = 'rgba(0,0,0,0.5)';
    camCtx.fillRect(0,0,240,135);
  }
  // Timestamp
  camCtx.fillStyle = 'rgba(0,150,0,0.7)';
  camCtx.font = '8px Courier Prime, monospace';
  camCtx.fillText(\`CAM \${camId+1} | \${new Date().toLocaleTimeString()}\`, 5, 125);
}

// ── Minimap ────────────────────────────────────────────
function renderMinimap() {
  if (!state) return;
  const scale = 128/MAP_W;
  mmCtx.fillStyle = '#050a03';
  mmCtx.fillRect(0,0,128,128);

  // Forest base
  mmCtx.fillStyle = '#0a1806';
  mmCtx.fillRect(0,0,128,128);

  // Cabin
  const cb = state.cabin;
  mmCtx.fillStyle = '#3a2a10';
  mmCtx.fillRect(cb.x*scale, cb.y*scale, cb.w*scale, cb.h*scale);

  // Structures
  for (const s of (state.structures||[])) {
    mmCtx.fillStyle = '#4a3a20';
    mmCtx.fillRect(s.x*scale-1, s.y*scale-1, 3, 3);
  }

  // Food
  for (const f of (state.food||[])) {
    if (!f.alive) continue;
    mmCtx.fillStyle = '#2a5a1a';
    mmCtx.fillRect(f.x*scale-1, f.y*scale-1, 2, 2);
  }

  // Traps
  for (const t of (state.traps||[])) {
    mmCtx.fillStyle = t.triggered ? '#5a1a1a' : '#8a5a20';
    mmCtx.fillRect(t.x*scale-1, t.y*scale-1, 2, 2);
  }

  // Bigfoot
  const bf = state.bigfoot;
  mmCtx.fillStyle = bf.state==='stunned' ? '#aa4400' : '#cc2200';
  mmCtx.beginPath();
  mmCtx.arc(bf.x*scale, bf.y*scale, 4, 0, Math.PI*2);
  mmCtx.fill();

  // Players
  for (const [id, p] of Object.entries(state.players)) {
    if (!p.alive) continue;
    mmCtx.fillStyle = p.color||'#4fc3f7';
    mmCtx.beginPath();
    mmCtx.arc(p.x*scale, p.y*scale, id===myId?3:2, 0, Math.PI*2);
    mmCtx.fill();
    if (id===myId) {
      mmCtx.strokeStyle='#ffffff';
      mmCtx.lineWidth=0.5;
      mmCtx.stroke();
    }
  }

  // Border
  mmCtx.strokeStyle = '#1a2a0a';
  mmCtx.lineWidth = 1;
  mmCtx.strokeRect(0,0,128,128);
}

// ── Main Render ────────────────────────────────────────
let lastFrame = 0;
let moveTimer = 0;

function render(ts) {
  requestAnimationFrame(render);
  if (!state || !myId) return;
  const dt = Math.min((ts - lastFrame)/1000, 0.05);
  lastFrame = ts;

  const me = state.players[myId];
  if (!me || !me.alive) return;

  // ── Movement ──
  const speed = 150;
  let dx=0, dy=0;
  if (keys['w']||keys['arrowup']) dy=-1;
  if (keys['s']||keys['arrowdown']) dy=1;
  if (keys['a']||keys['arrowleft']) dx=-1;
  if (keys['d']||keys['arrowright']) dx=1;
  if (dx!==0&&dy!==0) { dx*=0.707; dy*=0.707; }

  const nx = Math.max(0, Math.min(MAP_W, me.x + dx*speed*dt));
  const ny = Math.max(0, Math.min(MAP_H, me.y + dy*speed*dt));

  if (dx!==0||dy!==0) {
    // Footstep sound
    footstepTimer += dt;
    if (footstepTimer > 0.35) {
      footstepTimer=0;
      playSound('footstep', 0.15);
    }
  }

  const angle = Math.atan2(mouseY - canvas.height/2, mouseX - canvas.width/2);
  socket.emit('move', { x: nx, y: ny, angle, flashAngle: angle });

  // Smooth camera
  cam.x += (me.x - cam.x) * 8 * dt;
  cam.y += (me.y - cam.y) * 8 * dt;

  const offX = canvas.width/2 - cam.x;
  const offY = canvas.height/2 - cam.y;

  // ── Clear ──
  ctx.fillStyle = '#030805';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // ── Draw tiles ──
  const startTX = Math.floor((cam.x - canvas.width/2) / TILE) - 1;
  const endTX   = Math.ceil((cam.x + canvas.width/2) / TILE) + 1;
  const startTY = Math.floor((cam.y - canvas.height/2) / TILE) - 1;
  const endTY   = Math.ceil((cam.y + canvas.height/2) / TILE) + 1;

  for (let tx=startTX; tx<=endTX; tx++) {
    for (let ty=startTY; ty<=endTY; ty++) {
      const wx = tx*TILE, wy = ty*TILE;
      // Check if inside cabin zone — draw dirt
      const cb = state.cabin;
      let tile;
      if (wx>=cb.x&&wx<cb.x+cb.w&&wy>=cb.y&&wy<cb.y+cb.h) {
        tile = dirtTile;
      } else {
        tile = forestTiles[(tx+ty*7)%3];
      }
      ctx.drawImage(tile, wx+offX, wy+offY, TILE, TILE);
    }
  }

  // ── Draw cabin ──
  const cb = state.cabin;
  ctx.drawImage(cabinTex, cb.x+offX, cb.y+offY);
  ctx.strokeStyle = '#3a2a10';
  ctx.lineWidth = 4;
  ctx.strokeRect(cb.x+offX, cb.y+offY, cb.w, cb.h);

  // Door
  const doorX = cb.x + cb.w/2 + offX;
  const doorY = cb.y + cb.h + offY;
  ctx.fillStyle = cb.doorOpen ? 'rgba(10,30,5,0.6)' : '#2a1808';
  ctx.fillRect(doorX-20, cb.y+cb.h+offY-8, 40, 20);
  if (cb.doorOpen) {
    ctx.strokeStyle='#5a9a3a'; ctx.lineWidth=2;
    ctx.strokeRect(doorX-20, cb.y+cb.h+offY-8, 40, 20);
  }

  // Camera icons on cabin
  for (const camDef of (cb.cameras||[])) {
    ctx.fillStyle = cb.activeCam===camDef.id ? '#3aaa1a' : '#1a3a0a';
    ctx.beginPath();
    ctx.arc(camDef.x+offX, camDef.y+offY, 6, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#88ff44';
    ctx.font = '8px monospace';
    ctx.fillText(camDef.id+1, camDef.x+offX-3, camDef.y+offY+3);
  }

  // ── Draw structures ──
  for (const s of (state.structures||[])) {
    if (s.type==='wall') {
      ctx.fillStyle = '#2a1808';
      ctx.strokeStyle = '#4a2a10';
      ctx.lineWidth = 2;
      ctx.fillRect(s.x-20+offX, s.y-8+offY, 40, 16);
      ctx.strokeRect(s.x-20+offX, s.y-8+offY, 40, 16);
      // Wood grain
      ctx.strokeStyle='rgba(60,30,10,0.4)';
      ctx.lineWidth=1;
      for (let i=0;i<3;i++) {
        ctx.beginPath(); ctx.moveTo(s.x-18+i*12+offX, s.y-8+offY);
        ctx.lineTo(s.x-18+i*12+offX, s.y+8+offY); ctx.stroke();
      }
    }
  }

  // ── Draw food ──
  const foodIcons = { deer:'🦌', rabbit:'🐇', berry:'🍓', mushroom:'🍄' };
  for (const food of (state.food||[])) {
    if (!food.alive) continue;
    const fx = food.x+offX, fy = food.y+offY;
    if (fx<-50||fx>canvas.width+50||fy<-50||fy>canvas.height+50) continue;
    ctx.font='20px serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(foodIcons[food.type]||'🌿', fx, fy);

    // Proximity glow
    const d = Math.hypot(food.x-me.x, food.y-me.y);
    if (d < 100) {
      ctx.strokeStyle=\`rgba(100,200,50,\${0.6*(1-d/100)})\`;
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(fx,fy,18,0,Math.PI*2); ctx.stroke();
    }
  }

  // ── Draw traps ──
  for (const trap of (state.traps||[])) {
    const tx = trap.x+offX, ty = trap.y+offY;
    if (tx<-30||tx>canvas.width+30||ty<-30||ty>canvas.height+30) continue;
    ctx.fillStyle = trap.triggered ? '#3a0a0a' : '#5a3a10';
    ctx.beginPath(); ctx.arc(tx, ty, 10, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = trap.triggered ? '#aa2222' : '#8a6a30';
    ctx.lineWidth=2; ctx.stroke();
    ctx.font='12px monospace';
    ctx.fillStyle='#aaa'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(trap.triggered?'✗':'×', tx, ty);
  }

  // ── Draw projectiles ──
  for (const proj of (state.projectiles||[])) {
    const px = proj.x+offX, py = proj.y+offY;
    // Trail
    ctx.strokeStyle = 'rgba(255,220,100,0.6)';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - Math.cos(proj.angle)*20, py - Math.sin(proj.angle)*20);
    ctx.stroke();
    // Ball
    ctx.fillStyle='#ffcc44';
    ctx.beginPath(); ctx.arc(px,py,4,0,Math.PI*2); ctx.fill();
  }

  // ── Draw trees (sorted by y for depth) ──
  const visibleTrees = TREES.filter(t => {
    const tx=t.x+offX, ty=t.y+offY;
    return tx>-80&&tx<canvas.width+80&&ty>-100&&ty<canvas.height+100;
  }).sort((a,b)=>a.y-b.y);

  // Draw tree shadows first
  for (const tree of visibleTrees) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.save();
    ctx.translate(tree.x+offX+10, tree.y+offY+15);
    ctx.scale(1.2, 0.4);
    ctx.beginPath(); ctx.arc(0,0,22,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  for (const tree of visibleTrees) {
    ctx.drawImage(tree.sprite, tree.x+offX-30, tree.y+offY-70, 60, 80);
  }

  // ── Draw players ──
  for (const [id, p] of Object.entries(state.players)) {
    if (!p.alive) continue;
    const px = p.x+offX, py = p.y+offY;
    if (px<-40||px>canvas.width+40||py<-40||py>canvas.height+40) continue;

    // Flashlight cone
    if (p.flashlightOn) {
      const fAngle = p.flashlightAngle || 0;
      const fLen = id===myId ? 280 : 200;
      const fov = 0.45;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, fLen);
      grad.addColorStop(0, 'rgba(255,240,200,0.18)');
      grad.addColorStop(0.5, 'rgba(255,230,150,0.08)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, fLen, fAngle-fov, fAngle+fov);
      ctx.closePath();
      ctx.fill();
    }

    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.4)';
    ctx.save(); ctx.translate(px+5,py+10); ctx.scale(1.2,0.4);
    ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill(); ctx.restore();

    // Player sprite
    if (!playerSprites[p.color]) playerSprites[p.color] = makePlayerSprite(p.color);
    ctx.save();
    ctx.translate(px, py);
    if ((p.angle||0) > Math.PI/2 || (p.angle||0) < -Math.PI/2) {
      ctx.scale(-1,1); ctx.drawImage(playerSprites[p.color],-16,-20,32,40);
    } else {
      ctx.drawImage(playerSprites[p.color],-16,-20,32,40);
    }
    ctx.restore();

    // Name tag
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.fillRect(px-25, py-32, 50, 13);
    ctx.fillStyle = id===myId?'#aafa6a':p.color||'#4fc3f7';
    ctx.font='bold 9px Courier Prime, monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(p.name, px, py-26);

    // HP bar above
    const hpW = 40;
    ctx.fillStyle='#1a0a0a'; ctx.fillRect(px-hpW/2, py-40, hpW, 5);
    ctx.fillStyle = p.hp>60?'#3a8a3a':p.hp>30?'#8a7a1a':'#8a1a1a';
    ctx.fillRect(px-hpW/2, py-40, hpW*(p.hp/100), 5);
  }

  // ── Draw Bigfoot ──
  const bf = state.bigfoot;
  const bfx = bf.x+offX, bfy = bf.y+offY;
  if (bfx>-80&&bfx<canvas.width+80&&bfy>-80&&bfy<canvas.height+80) {
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.5)';
    ctx.save(); ctx.translate(bfx+8,bfy+20); ctx.scale(1.5,0.4);
    ctx.beginPath(); ctx.arc(0,0,25,0,Math.PI*2); ctx.fill(); ctx.restore();

    // Stun effect
    if (bf.state==='stunned') {
      ctx.strokeStyle='rgba(100,200,255,0.6)';
      ctx.lineWidth=2;
      const r = 35 + Math.sin(Date.now()*0.01)*5;
      ctx.beginPath(); ctx.arc(bfx,bfy,r,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='rgba(100,200,255,0.1)';
      ctx.fill();
      // Stars
      for (let i=0;i<3;i++) {
        const a = Date.now()*0.003 + i*Math.PI*2/3;
        ctx.fillStyle='rgba(200,255,100,0.8)';
        ctx.font='14px serif';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('⭐', bfx+Math.cos(a)*25, bfy-30+Math.sin(a)*10);
      }
    }

    ctx.drawImage(bfSprite, bfx-30, bfy-60, 60, 80);

    // HP bar
    ctx.fillStyle='#1a0505';
    ctx.fillRect(bfx-35, bfy-68, 70, 7);
    ctx.fillStyle= bf.state==='stunned'?'#4488ff':'#cc2222';
    ctx.fillRect(bfx-35, bfy-68, 70*(bf.hp/bf.maxHp), 7);
    ctx.fillStyle='rgba(200,50,50,0.7)'; ctx.font='8px monospace';
    ctx.textAlign='center'; ctx.fillText('BIGFOOT', bfx, bfy-72);
  }

  // ── Darkness overlay with flashlight cutout ──
  const meFlashOn = me.flashlightOn;
  const fAngle = Math.atan2(mouseY-canvas.height/2, mouseX-canvas.width/2);
  const fLen = 300;

  // Dark overlay
  ctx.save();
  ctx.fillStyle = \`rgba(0,0,0,0.87)\`;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Cut out flashlight
  if (meFlashOn) {
    ctx.globalCompositeOperation='destination-out';
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, fLen);
    grad.addColorStop(0, 'rgba(0,0,0,0.95)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(canvas.width/2, canvas.height/2);
    ctx.arc(canvas.width/2, canvas.height/2, fLen, fAngle-0.42, fAngle+0.42);
    ctx.closePath();
    ctx.fill();
  }

  // Ambient glow around player
  ctx.globalCompositeOperation='destination-out';
  const ambGrad = ctx.createRadialGradient(canvas.width/2,canvas.height/2,0,canvas.width/2,canvas.height/2,60);
  ambGrad.addColorStop(0,'rgba(0,0,0,0.3)');
  ambGrad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=ambGrad;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.restore();

  // ── Vignette ──
  const vig = ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.height*0.3,canvas.width/2,canvas.height/2,canvas.height*0.8);
  vig.addColorStop(0,'rgba(0,0,0,0)');
  vig.addColorStop(1,'rgba(0,0,0,0.7)');
  ctx.fillStyle=vig;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // ── Build mode cursor ──
  if (buildMode) {
    ctx.strokeStyle='rgba(100,200,50,0.6)';
    ctx.lineWidth=2;
    ctx.setLineDash([4,4]);
    ctx.strokeRect(mouseX-20, mouseY-8, 40, 16);
    ctx.setLineDash([]);
  }

  // ── Minimap ──
  renderMinimap();
}
</script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(HTML);
});

// ─── Game State ───────────────────────────────────────────────────────────────
const MAP_W = 3200, MAP_H = 3200;

const gameState = {
  players: {},
  bigfoot: {
    x: 1800, y: 1800,
    hp: 300, maxHp: 300,
    speed: 1.2,
    state: 'roam',
    stunTimer: 0,
    targetId: null,
    lastMoveAngle: Math.random() * Math.PI * 2,
    alertRadius: 400,
    chaseRadius: 600,
  },
  cabin: {
    x: 1500, y: 1500,
    w: 256, h: 192,
    doorOpen: false,
    doorTimer: 0,
    cameras: [
      { id: 0, x: 1490, y: 1490, angle: 0, fov: 80 },
      { id: 1, x: 1740, y: 1490, angle: Math.PI, fov: 80 },
      { id: 2, x: 1490, y: 1680, angle: Math.PI/2, fov: 80 },
      { id: 3, x: 1740, y: 1680, angle: -Math.PI/2, fov: 80 },
    ],
    activeCam: 0,
    power: 100,
  },
  traps: [],
  food: [],
  structures: [],
  projectiles: [],
  logs: [],
  time: 0,
};

function spawnFood() {
  const types = ['deer','rabbit','berry','mushroom'];
  while (gameState.food.length < 20) {
    gameState.food.push({
      id: Math.random().toString(36).substr(2,9),
      type: types[Math.floor(Math.random()*types.length)],
      x: 400 + Math.random() * (MAP_W - 800),
      y: 400 + Math.random() * (MAP_H - 800),
      alive: true,
    });
  }
}
spawnFood();

const TICK = 50;
setInterval(() => {
  const dt = TICK / 1000;
  gameState.time += dt;
  updateBigfoot(dt);
  updateProjectiles(dt);
  updateDoor(dt);
  updateCabinPower(dt);
  checkTraps();
  io.emit('state', getPublicState());
}, TICK);

function updateCabinPower(dt) {
  const cb = gameState.cabin;
  const n = Object.values(gameState.players).filter(p => p.inCabin && p.viewingCam).length;
  cb.power = Math.max(0, Math.min(100, cb.power - n * 0.05 + 0.02));
}

function updateDoor(dt) {
  const cb = gameState.cabin;
  if (cb.doorTimer > 0) {
    cb.doorTimer -= dt;
    if (cb.doorTimer <= 0) { cb.doorOpen = false; io.emit('door_closed'); }
  }
}

function updateBigfoot(dt) {
  const bf = gameState.bigfoot;
  const players = Object.values(gameState.players);
  if (bf.stunTimer > 0) { bf.stunTimer -= dt; bf.state = 'stunned'; return; }
  let nearest = null, nearestDist = Infinity;
  for (const p of players) {
    if (!p.alive) continue;
    const d = dist(bf.x, bf.y, p.x, p.y);
    if (d < nearestDist) { nearestDist = d; nearest = p; }
  }
  if (nearest && nearestDist < bf.alertRadius) {
    bf.state = 'chase';
    bf.targetId = nearest.id;
    const angle = Math.atan2(nearest.y - bf.y, nearest.x - bf.x);
    const spd = nearestDist < bf.chaseRadius ? bf.speed * 80 : bf.speed * 50;
    bf.x += Math.cos(angle) * spd * dt;
    bf.y += Math.sin(angle) * spd * dt;
    if (nearestDist < 40) {
      nearest.hp = Math.max(0, nearest.hp - 15 * dt);
      if (nearest.hp <= 0) {
        nearest.alive = false;
        io.to(nearest.id).emit('player_dead');
        addLog(`💀 ${nearest.name} was caught by Bigfoot!`);
      }
    }
  } else {
    bf.state = 'roam';
    bf.targetId = null;
    if (Math.random() < 0.02) bf.lastMoveAngle += (Math.random()-0.5)*1.2;
    bf.x += Math.cos(bf.lastMoveAngle) * 30 * dt;
    bf.y += Math.sin(bf.lastMoveAngle) * 30 * dt;
    bf.x = Math.max(100, Math.min(MAP_W-100, bf.x));
    bf.y = Math.max(100, Math.min(MAP_H-100, bf.y));
  }
  if (bf.hp < bf.maxHp) bf.hp = Math.min(bf.maxHp, bf.hp + 2 * dt);
}

function updateProjectiles(dt) {
  const bf = gameState.bigfoot;
  gameState.projectiles = gameState.projectiles.filter(p => {
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    p.life -= dt;
    if (dist(p.x, p.y, bf.x, bf.y) < 60 && !p.hit) {
      p.hit = true; bf.hp -= 40; bf.stunTimer = 6; bf.state = 'stunned';
      io.emit('bigfoot_stunned', { x: bf.x, y: bf.y });
      addLog(`🔫 ${p.playerName} stunned Bigfoot!`);
      if (bf.hp <= 0) { bf.hp = 50; bf.stunTimer = 15; addLog('⚠️ Bigfoot is retreating!'); }
    }
    return p.life > 0 && !p.hit;
  });
}

function checkTraps() {
  const bf = gameState.bigfoot;
  for (const trap of gameState.traps) {
    if (trap.triggered) continue;
    if (dist(trap.x, trap.y, bf.x, bf.y) < 50) {
      trap.triggered = true; bf.stunTimer = 10; bf.speed = 0.6;
      addLog('🪤 Bigfoot stepped in a bear trap!');
      io.emit('trap_triggered', { id: trap.id, x: trap.x, y: trap.y });
      setTimeout(() => { bf.speed = 1.2; }, 10000);
    }
  }
}

function addLog(msg) {
  gameState.logs.unshift({ msg, time: Date.now() });
  if (gameState.logs.length > 20) gameState.logs.pop();
  io.emit('log', msg);
}

function dist(x1,y1,x2,y2) { return Math.sqrt((x2-x1)**2+(y2-y1)**2); }

function getPublicState() {
  return {
    players: gameState.players,
    bigfoot: { x: gameState.bigfoot.x, y: gameState.bigfoot.y, hp: gameState.bigfoot.hp, maxHp: gameState.bigfoot.maxHp, state: gameState.bigfoot.state, stunTimer: gameState.bigfoot.stunTimer },
    cabin: gameState.cabin,
    traps: gameState.traps,
    food: gameState.food,
    structures: gameState.structures,
    projectiles: gameState.projectiles,
    time: gameState.time,
    logs: gameState.logs.slice(0,8),
  };
}

io.on('connection', (socket) => {
  socket.on('join', ({ name }) => {
    const colors = ['#4fc3f7','#81c784','#ffb74d','#f48fb1','#ce93d8','#80cbc4'];
    gameState.players[socket.id] = {
      id: socket.id, name: name || `Hunter${Object.keys(gameState.players).length+1}`,
      x: 1500+Math.random()*200, y: 1550+Math.random()*100,
      hp: 100, maxHp: 100, hunger: 100, stamina: 100,
      alive: true, inCabin: false, viewingCam: false,
      flashlightOn: true, flashlightAngle: 0,
      ammo: 6, trapsCarried: 3,
      color: colors[Object.keys(gameState.players).length % colors.length],
    };
    addLog(`🌲 ${gameState.players[socket.id].name} joined the hunt!`);
    socket.emit('joined', { id: socket.id, mapW: MAP_W, mapH: MAP_H });
  });

  socket.on('move', ({ x, y, angle, flashAngle }) => {
    const p = gameState.players[socket.id];
    if (!p || !p.alive) return;
    p.x = Math.max(0, Math.min(MAP_W, x)); p.y = Math.max(0, Math.min(MAP_H, y));
    p.angle = angle; p.flashlightAngle = flashAngle;
    const cb = gameState.cabin;
    p.inCabin = (p.x > cb.x && p.x < cb.x+cb.w && p.y > cb.y && p.y < cb.y+cb.h);
    p.hunger = Math.max(0, p.hunger - 0.02);
    if (p.hunger <= 0) p.hp = Math.max(0, p.hp - 0.01);
  });

  socket.on('shoot', ({ angle }) => {
    const p = gameState.players[socket.id];
    if (!p || !p.alive || p.ammo <= 0) return;
    p.ammo--;
    gameState.projectiles.push({ id: Math.random().toString(36).substr(2,9), x: p.x, y: p.y, angle, speed: 600, life: 1.5, playerId: socket.id, playerName: p.name, hit: false });
    io.emit('shot_fired', { x: p.x, y: p.y, angle });
    if (p.ammo === 0) addLog(`⚠️ ${p.name} is out of ammo!`);
  });

  socket.on('place_trap', ({ x, y }) => {
    const p = gameState.players[socket.id];
    if (!p || !p.alive || p.trapsCarried <= 0) return;
    p.trapsCarried--;
    const trap = { id: Math.random().toString(36).substr(2,9), x, y, triggered: false, placedBy: p.name };
    gameState.traps.push(trap);
    io.emit('trap_placed', trap);
    addLog(`🪤 ${p.name} placed a bear trap.`);
  });

  socket.on('collect_food', ({ foodId }) => {
    const p = gameState.players[socket.id];
    const food = gameState.food.find(f => f.id === foodId && f.alive);
    if (!p || !food || dist(p.x, p.y, food.x, food.y) > 80) return;
    food.alive = false;
    const heal = food.type==='deer'?30:food.type==='rabbit'?15:food.type==='berry'?10:8;
    p.hunger = Math.min(100, p.hunger + heal);
    addLog(`🍖 ${p.name} ate a ${food.type}. (+${heal} hunger)`);
    io.emit('food_collected', { foodId });
    setTimeout(() => { food.alive=true; food.x=400+Math.random()*(MAP_W-800); food.y=400+Math.random()*(MAP_H-800); io.emit('food_respawned', food); }, 30000);
  });

  socket.on('build', ({ x, y, type }) => {
    const p = gameState.players[socket.id];
    if (!p || !p.alive) return;
    const s = { id: Math.random().toString(36).substr(2,9), x, y, type, placedBy: p.name, hp: 100 };
    gameState.structures.push(s);
    io.emit('structure_built', s);
    addLog(`🔨 ${p.name} built a ${type}.`);
  });

  socket.on('toggle_door', () => {
    const cb = gameState.cabin;
    cb.doorOpen = !cb.doorOpen;
    if (cb.doorOpen) { cb.doorTimer=8; io.emit('door_opened'); addLog('🚪 Cabin door opened!'); }
    else { cb.doorTimer=0; io.emit('door_closed'); addLog('🔒 Cabin door locked.'); }
  });

  socket.on('switch_camera', ({ camId }) => { gameState.cabin.activeCam = camId; });
  socket.on('toggle_flashlight', () => { const p=gameState.players[socket.id]; if(p) p.flashlightOn=!p.flashlightOn; });
  socket.on('reload', () => { const p=gameState.players[socket.id]; if(p&&p.ammo<6){p.ammo=6;socket.emit('log','🔫 Musket reloaded!');} });

  socket.on('respawn', () => {
    const p = gameState.players[socket.id];
    if (p) { p.hp=100;p.hunger=80;p.alive=true;p.x=1500+Math.random()*200;p.y=1550+Math.random()*100;p.ammo=6;p.trapsCarried=3; addLog(`👣 ${p.name} respawned.`); }
  });

  socket.on('disconnect', () => {
    const p = gameState.players[socket.id];
    if (p) { addLog(`🌲 ${p.name} left the forest.`); delete gameState.players[socket.id]; }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Bigfoot Survival running on port ${PORT}`));

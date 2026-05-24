const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// ─── Game State ───────────────────────────────────────────────────────────────
const MAP_W = 3200, MAP_H = 3200;
const TILE = 64;

const gameState = {
  players: {},
  bigfoot: {
    x: 1800, y: 1800,
    hp: 300, maxHp: 300,
    speed: 1.2,
    state: 'roam',   // roam | chase | stunned
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
  night: true,
  ambientLight: 0.08,
};

// Spawn food items
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

// ─── Game Loop ────────────────────────────────────────────────────────────────
const TICK = 50; // 20 tps
setInterval(() => {
  const dt = TICK / 1000;
  gameState.time += dt;

  updateBigfoot(dt);
  updateProjectiles(dt);
  updateDoor(dt);
  updateCabinPower(dt);
  checkTraps();

  // Broadcast state
  io.emit('state', getPublicState());
}, TICK);

function updateCabinPower(dt) {
  const cb = gameState.cabin;
  const numCamsActive = Object.values(gameState.players).filter(p => p.inCabin && p.viewingCam).length;
  cb.power = Math.max(0, Math.min(100, cb.power - numCamsActive * 0.05 + 0.02));
}

function updateDoor(dt) {
  const cb = gameState.cabin;
  if (cb.doorTimer > 0) {
    cb.doorTimer -= dt;
    if (cb.doorTimer <= 0) {
      cb.doorOpen = false;
      io.emit('door_closed');
    }
  }
}

function updateBigfoot(dt) {
  const bf = gameState.bigfoot;
  const players = Object.values(gameState.players);

  if (bf.stunTimer > 0) {
    bf.stunTimer -= dt;
    bf.state = 'stunned';
    return;
  }

  // Find nearest player
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

    // Attack player
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
    // Random roam
    if (Math.random() < 0.02) bf.lastMoveAngle += (Math.random()-0.5)*1.2;
    bf.x += Math.cos(bf.lastMoveAngle) * 30 * dt;
    bf.y += Math.sin(bf.lastMoveAngle) * 30 * dt;
    bf.x = Math.max(100, Math.min(MAP_W-100, bf.x));
    bf.y = Math.max(100, Math.min(MAP_H-100, bf.y));
  }

  // Regenerate Bigfoot HP slowly
  if (bf.hp < bf.maxHp) bf.hp = Math.min(bf.maxHp, bf.hp + 2 * dt);
}

function updateProjectiles(dt) {
  const bf = gameState.bigfoot;
  gameState.projectiles = gameState.projectiles.filter(p => {
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    p.life -= dt;
    // Hit bigfoot
    if (dist(p.x, p.y, bf.x, bf.y) < 60 && !p.hit) {
      p.hit = true;
      bf.hp -= 40;
      bf.stunTimer = 6;
      bf.state = 'stunned';
      io.emit('bigfoot_stunned', { x: bf.x, y: bf.y });
      addLog(`🔫 ${p.playerName} stunned Bigfoot with a musket!`);
      if (bf.hp <= 0) {
        bf.hp = 50;
        bf.stunTimer = 15;
        addLog('⚠️ Bigfoot is retreating!');
      }
    }
    return p.life > 0 && !p.hit;
  });
}

function checkTraps() {
  const bf = gameState.bigfoot;
  for (const trap of gameState.traps) {
    if (trap.triggered) continue;
    if (dist(trap.x, trap.y, bf.x, bf.y) < 50) {
      trap.triggered = true;
      bf.stunTimer = 10;
      bf.speed = 0.6;
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

function dist(x1,y1,x2,y2) {
  return Math.sqrt((x2-x1)**2+(y2-y1)**2);
}

function getPublicState() {
  return {
    players: gameState.players,
    bigfoot: {
      x: gameState.bigfoot.x, y: gameState.bigfoot.y,
      hp: gameState.bigfoot.hp, maxHp: gameState.bigfoot.maxHp,
      state: gameState.bigfoot.state,
      stunTimer: gameState.bigfoot.stunTimer,
    },
    cabin: gameState.cabin,
    traps: gameState.traps,
    food: gameState.food,
    structures: gameState.structures,
    projectiles: gameState.projectiles,
    time: gameState.time,
    logs: gameState.logs.slice(0,8),
  };
}

// ─── Socket Events ────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join', ({ name }) => {
    const colors = ['#4fc3f7','#81c784','#ffb74d','#f48fb1','#ce93d8','#80cbc4'];
    gameState.players[socket.id] = {
      id: socket.id,
      name: name || `Hunter${Object.keys(gameState.players).length+1}`,
      x: 1500 + Math.random()*200,
      y: 1550 + Math.random()*100,
      hp: 100, maxHp: 100,
      hunger: 100,
      stamina: 100,
      alive: true,
      inCabin: false,
      viewingCam: false,
      flashlightOn: true,
      flashlightAngle: 0,
      ammo: 6,
      trapsCarried: 3,
      color: colors[Object.keys(gameState.players).length % colors.length],
    };
    addLog(`🌲 ${gameState.players[socket.id].name} joined the hunt!`);
    socket.emit('joined', { id: socket.id, mapW: MAP_W, mapH: MAP_H });
  });

  socket.on('move', ({ x, y, angle, flashAngle }) => {
    const p = gameState.players[socket.id];
    if (!p || !p.alive) return;
    p.x = Math.max(0, Math.min(MAP_W, x));
    p.y = Math.max(0, Math.min(MAP_H, y));
    p.angle = angle;
    p.flashlightAngle = flashAngle;

    // Check if in cabin
    const cb = gameState.cabin;
    p.inCabin = (p.x > cb.x && p.x < cb.x+cb.w && p.y > cb.y && p.y < cb.y+cb.h);

    // Hunger decay
    p.hunger = Math.max(0, p.hunger - 0.02);
    if (p.hunger <= 0) p.hp = Math.max(0, p.hp - 0.01);
  });

  socket.on('shoot', ({ angle }) => {
    const p = gameState.players[socket.id];
    if (!p || !p.alive || p.ammo <= 0) return;
    p.ammo--;
    gameState.projectiles.push({
      id: Math.random().toString(36).substr(2,9),
      x: p.x, y: p.y,
      angle, speed: 600,
      life: 1.5,
      playerId: socket.id,
      playerName: p.name,
      hit: false,
    });
    io.emit('shot_fired', { x: p.x, y: p.y, angle });
    if (p.ammo === 0) addLog(`⚠️ ${p.name} is out of ammo! Find gunpowder.`);
  });

  socket.on('place_trap', ({ x, y }) => {
    const p = gameState.players[socket.id];
    if (!p || !p.alive || p.trapsCarried <= 0) return;
    p.trapsCarried--;
    const trap = {
      id: Math.random().toString(36).substr(2,9),
      x, y, triggered: false, placedBy: p.name,
    };
    gameState.traps.push(trap);
    io.emit('trap_placed', trap);
    addLog(`🪤 ${p.name} placed a bear trap.`);
  });

  socket.on('collect_food', ({ foodId }) => {
    const p = gameState.players[socket.id];
    const food = gameState.food.find(f => f.id === foodId && f.alive);
    if (!p || !food) return;
    if (dist(p.x, p.y, food.x, food.y) > 80) return;
    food.alive = false;
    const heal = food.type === 'deer' ? 30 : food.type === 'rabbit' ? 15 : food.type === 'berry' ? 10 : 8;
    p.hunger = Math.min(100, p.hunger + heal);
    addLog(`🍖 ${p.name} ate a ${food.type}. (+${heal} hunger)`);
    io.emit('food_collected', { foodId });
    setTimeout(() => {
      food.alive = true;
      food.x = 400 + Math.random()*(MAP_W-800);
      food.y = 400 + Math.random()*(MAP_H-800);
      io.emit('food_respawned', food);
    }, 30000);
  });

  socket.on('build', ({ x, y, type }) => {
    const p = gameState.players[socket.id];
    if (!p || !p.alive) return;
    const structure = {
      id: Math.random().toString(36).substr(2,9),
      x, y, type,
      placedBy: p.name,
      hp: 100,
    };
    gameState.structures.push(structure);
    io.emit('structure_built', structure);
    addLog(`🔨 ${p.name} built a ${type}.`);
  });

  socket.on('toggle_door', () => {
    const cb = gameState.cabin;
    cb.doorOpen = !cb.doorOpen;
    if (cb.doorOpen) {
      cb.doorTimer = 8;
      io.emit('door_opened');
      addLog('🚪 Cabin door opened!');
    } else {
      cb.doorTimer = 0;
      io.emit('door_closed');
      addLog('🔒 Cabin door locked.');
    }
  });

  socket.on('switch_camera', ({ camId }) => {
    gameState.cabin.activeCam = camId;
  });

  socket.on('toggle_flashlight', () => {
    const p = gameState.players[socket.id];
    if (p) p.flashlightOn = !p.flashlightOn;
  });

  socket.on('reload', () => {
    const p = gameState.players[socket.id];
    if (p && p.ammo < 6) {
      p.ammo = 6;
      socket.emit('log', '🔫 Musket reloaded!');
    }
  });

  socket.on('respawn', () => {
    const p = gameState.players[socket.id];
    if (p) {
      p.hp = 100; p.hunger = 80; p.alive = true;
      p.x = 1500 + Math.random()*200;
      p.y = 1550 + Math.random()*100;
      p.ammo = 6; p.trapsCarried = 3;
      addLog(`👣 ${p.name} respawned.`);
    }
  });

  socket.on('disconnect', () => {
    const p = gameState.players[socket.id];
    if (p) {
      addLog(`🌲 ${p.name} left the forest.`);
      delete gameState.players[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Bigfoot Survival running on port ${PORT}`));

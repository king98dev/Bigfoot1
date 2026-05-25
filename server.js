const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client.html'));
});

// ─── Game State ───────────────────────────────────────────────────────────────
const MAP_W = 3200, MAP_H = 3200;

const gameState = {
  players: {},
  bigfoot: {
    x: 1800, y: 1800, hp: 300, maxHp: 300, speed: 1.2,
    state: 'roam', stunTimer: 0, targetId: null,
    lastMoveAngle: Math.random()*Math.PI*2,
    alertRadius: 400, chaseRadius: 600,
  },
  cabin: {
    x: 1500, y: 1500, w: 256, h: 192,
    doorOpen: false, doorTimer: 0,
    cameras: [
      {id:0,x:1490,y:1490},{id:1,x:1740,y:1490},
      {id:2,x:1490,y:1680},{id:3,x:1740,y:1680},
    ],
    activeCam: 0, power: 100,
  },
  traps: [], food: [], structures: [], projectiles: [], logs: [],
};

function spawnFood() {
  const types = ['deer','rabbit','berry','mushroom'];
  while (gameState.food.length < 20) {
    gameState.food.push({
      id: Math.random().toString(36).substr(2,9),
      type: types[Math.floor(Math.random()*types.length)],
      x: 400+Math.random()*(MAP_W-800),
      y: 400+Math.random()*(MAP_H-800),
      alive: true,
    });
  }
}
spawnFood();

setInterval(() => {
  const dt = 0.05;
  updateBigfoot(dt); updateProjectiles(dt); updateDoor(dt); checkTraps();
  io.emit('state', getPublicState());
}, 50);

function updateDoor(dt) {
  const cb = gameState.cabin;
  if (cb.doorTimer > 0) { cb.doorTimer -= dt; if (cb.doorTimer <= 0) { cb.doorOpen=false; io.emit('door_closed'); } }
}

function updateBigfoot(dt) {
  const bf = gameState.bigfoot;
  const players = Object.values(gameState.players);
  if (bf.stunTimer > 0) { bf.stunTimer -= dt; bf.state='stunned'; return; }
  let nearest=null, nearestDist=Infinity;
  for (const p of players) {
    if (!p.alive) continue;
    const d = dist(bf.x,bf.y,p.x,p.y);
    if (d < nearestDist) { nearestDist=d; nearest=p; }
  }
  if (nearest && nearestDist < bf.alertRadius) {
    bf.state='chase'; bf.targetId=nearest.id;
    const angle = Math.atan2(nearest.y-bf.y, nearest.x-bf.x);
    bf.x += Math.cos(angle)*(nearestDist<bf.chaseRadius?bf.speed*80:bf.speed*50)*dt;
    bf.y += Math.sin(angle)*(nearestDist<bf.chaseRadius?bf.speed*80:bf.speed*50)*dt;
    if (nearestDist < 40) {
      nearest.hp = Math.max(0, nearest.hp-15*dt);
      if (nearest.hp <= 0) { nearest.alive=false; io.to(nearest.id).emit('player_dead'); addLog(`💀 ${nearest.name} was caught!`); }
    }
  } else {
    bf.state='roam'; bf.targetId=null;
    if (Math.random()<0.02) bf.lastMoveAngle+=(Math.random()-0.5)*1.2;
    bf.x = Math.max(100,Math.min(MAP_W-100, bf.x+Math.cos(bf.lastMoveAngle)*30*dt));
    bf.y = Math.max(100,Math.min(MAP_H-100, bf.y+Math.sin(bf.lastMoveAngle)*30*dt));
  }
  if (bf.hp < bf.maxHp) bf.hp = Math.min(bf.maxHp, bf.hp+2*dt);
}

function updateProjectiles(dt) {
  const bf = gameState.bigfoot;
  gameState.projectiles = gameState.projectiles.filter(p => {
    p.x += Math.cos(p.angle)*p.speed*dt; p.y += Math.sin(p.angle)*p.speed*dt; p.life -= dt;
    if (!p.hit && dist(p.x,p.y,bf.x,bf.y)<60) {
      p.hit=true; bf.hp-=40; bf.stunTimer=6; bf.state='stunned';
      io.emit('bigfoot_stunned',{x:bf.x,y:bf.y});
      addLog(`🔫 ${p.playerName} stunned Bigfoot!`);
      if (bf.hp<=0) { bf.hp=50; bf.stunTimer=15; addLog('⚠️ Bigfoot retreating!'); }
    }
    return p.life>0 && !p.hit;
  });
}

function checkTraps() {
  const bf = gameState.bigfoot;
  for (const trap of gameState.traps) {
    if (trap.triggered) continue;
    if (dist(trap.x,trap.y,bf.x,bf.y)<50) {
      trap.triggered=true; bf.stunTimer=10;
      addLog('🪤 Bigfoot in a bear trap!');
      io.emit('trap_triggered',{id:trap.id,x:trap.x,y:trap.y});
    }
  }
}

function addLog(msg) {
  gameState.logs.unshift({msg,time:Date.now()});
  if (gameState.logs.length>20) gameState.logs.pop();
  io.emit('log',msg);
}

function dist(x1,y1,x2,y2) { return Math.sqrt((x2-x1)**2+(y2-y1)**2); }

function getPublicState() {
  return {
    players: gameState.players,
    bigfoot: {x:gameState.bigfoot.x,y:gameState.bigfoot.y,hp:gameState.bigfoot.hp,maxHp:gameState.bigfoot.maxHp,state:gameState.bigfoot.state,stunTimer:gameState.bigfoot.stunTimer},
    cabin: gameState.cabin, traps: gameState.traps, food: gameState.food,
    structures: gameState.structures, projectiles: gameState.projectiles,
    logs: gameState.logs.slice(0,8),
  };
}

io.on('connection', (socket) => {
  socket.on('join', ({name}) => {
    const colors=['#4fc3f7','#81c784','#ffb74d','#f48fb1','#ce93d8','#80cbc4'];
    gameState.players[socket.id]={
      id:socket.id, name:name||`Hunter${Object.keys(gameState.players).length+1}`,
      x:1500+Math.random()*200, y:1550+Math.random()*100,
      hp:100, maxHp:100, hunger:100, alive:true,
      flashlightOn:true, angle:0, ammo:6, trapsCarried:3,
      color:colors[Object.keys(gameState.players).length%colors.length],
    };
    addLog(`🌲 ${gameState.players[socket.id].name} joined!`);
    socket.emit('joined',{id:socket.id,mapW:MAP_W,mapH:MAP_H});
  });

  socket.on('move',({x,y,angle}) => {
    const p=gameState.players[socket.id]; if(!p||!p.alive) return;
    p.x=Math.max(0,Math.min(MAP_W,x)); p.y=Math.max(0,Math.min(MAP_H,y)); p.angle=angle;
    p.hunger=Math.max(0,p.hunger-0.02);
    if(p.hunger<=0) p.hp=Math.max(0,p.hp-0.01);
  });

  socket.on('shoot',({angle}) => {
    const p=gameState.players[socket.id]; if(!p||!p.alive||p.ammo<=0) return;
    p.ammo--;
    gameState.projectiles.push({id:Math.random().toString(36).substr(2,9),x:p.x,y:p.y,angle,speed:600,life:1.5,playerId:socket.id,playerName:p.name,hit:false});
    io.emit('shot_fired',{x:p.x,y:p.y,angle});
  });

  socket.on('place_trap',({x,y}) => {
    const p=gameState.players[socket.id]; if(!p||!p.alive||p.trapsCarried<=0) return;
    p.trapsCarried--;
    const trap={id:Math.random().toString(36).substr(2,9),x,y,triggered:false};
    gameState.traps.push(trap); io.emit('trap_placed',trap);
    addLog(`🪤 ${p.name} placed a bear trap.`);
  });

  socket.on('collect_food',({foodId}) => {
    const p=gameState.players[socket.id];
    const food=gameState.food.find(f=>f.id===foodId&&f.alive);
    if(!p||!food||dist(p.x,p.y,food.x,food.y)>80) return;
    food.alive=false;
    const heal=food.type==='deer'?30:food.type==='rabbit'?15:food.type==='berry'?10:8;
    p.hunger=Math.min(100,p.hunger+heal);
    addLog(`🍖 ${p.name} ate ${food.type}. (+${heal})`);
    io.emit('food_collected',{foodId});
    setTimeout(()=>{ food.alive=true; food.x=400+Math.random()*(MAP_W-800); food.y=400+Math.random()*(MAP_H-800); io.emit('food_respawned',food); },30000);
  });

  socket.on('build',({x,y,type}) => {
    const p=gameState.players[socket.id]; if(!p||!p.alive) return;
    const s={id:Math.random().toString(36).substr(2,9),x,y,type,hp:100};
    gameState.structures.push(s); io.emit('structure_built',s);
    addLog(`🔨 ${p.name} built a ${type}.`);
  });

  socket.on('toggle_door',() => {
    const cb=gameState.cabin; cb.doorOpen=!cb.doorOpen;
    if(cb.doorOpen){cb.doorTimer=8;io.emit('door_opened');addLog('🚪 Door opened!');}
    else{cb.doorTimer=0;io.emit('door_closed');addLog('🔒 Door locked.');}
  });

  socket.on('switch_camera',({camId})=>{ gameState.cabin.activeCam=camId; });
  socket.on('toggle_flashlight',()=>{ const p=gameState.players[socket.id]; if(p) p.flashlightOn=!p.flashlightOn; });
  socket.on('reload',()=>{ const p=gameState.players[socket.id]; if(p&&p.ammo<6){p.ammo=6;socket.emit('log','🔫 Reloaded!');} });

  socket.on('respawn',()=>{
    const p=gameState.players[socket.id]; if(!p) return;
    Object.assign(p,{hp:100,hunger:80,alive:true,x:1500+Math.random()*200,y:1550+Math.random()*100,ammo:6,trapsCarried:3});
    addLog(`👣 ${p.name} respawned.`);
  });

  socket.on('disconnect',()=>{
    const p=gameState.players[socket.id];
    if(p){addLog(`🌲 ${p.name} left.`);delete gameState.players[socket.id];}
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Bigfoot 3D running on port ${PORT}`));

const MathUtils = {
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
};

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGainNode = audioCtx.createGain();
masterGainNode.connect(audioCtx.destination);

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(masterGainNode);
    
    const now = audioCtx.currentTime;
    
    if (type === 'move') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'hurt') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'eat') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.setValueAtTime(1600, now + 0.05);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'levelUp') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(500, now + 0.1);
        osc.frequency.setValueAtTime(600, now + 0.2);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'gameOver') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(100, now + 1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 1);
        osc.start(now);
        osc.stop(now + 1);
    }
}

const BOARD_SIZE = 11;
let state = {
    level: 1,
    inShop: false,
    hp: 20,
    maxHp: 20,
    attack: 1,
    hunger: 100,
    maxHunger: 100,
    gold: 0,
    potions: 0,
    maxPotions: 1,
    hpPrice: 20,
    atkPrice: 40,
    potionSlotPrice: 30,
    hasKey: false,
    playerPos: { x: 0, y: 0 },
    monsters: [],
    board: [], // 2D array: 0 for floor, 1 for wall
    items: [], // [{x, y, type: 'key'|'food'|'door'|'potion'}]
    isBossLevel: false,
};

const TYPES = {
    FLOOR: 0,
    WALL: 1
};

const EMOJIS = {
    PLAYER: '🧙‍♂️',
    MONSTER: '👾',
    FOOD: '🍖',
    POTION: '🧪',
    KEY: '🗝️',
    DOOR: '🚪',
    WALL: '🧱',
    FLOOR: ''
};

function initGame() {
    console.log("Game Initialization started...");
    state.level = 1;
    state.inShop = false;
    state.maxHp = 20;
    state.hp = 20;
    state.attack = 1;
    state.maxHunger = 100;
    state.hunger = 100;
    state.gold = 0;
    state.potions = 0;
    state.maxPotions = 1;
    state.hpPrice = 20;
    state.atkPrice = 40;
    state.potionSlotPrice = 30;
    state.hasKey = false;
    state.gameOver = false;
    
    generateMap();
    placeEntities();
    renderBoard();
    updateStatus();
    showMessage("歡迎來到像素地牢第 1 層！尋找鑰匙並前往出口。");
}

function nextLevel() {
    playSound('levelUp');
    state.hasKey = false;
    if (state.level % 10 === 0 && !state.inShop) {
        enterShop();
        return;
    }
    
    if (state.inShop) {
        state.inShop = false;
    }
    
    state.level++;
    generateMap();
    placeEntities();
    renderBoard();
    updateStatus();
    showMessage(`進入了第 ${state.level} 層地牢！尋找鑰匙並前往出口。`);
}

function enterShop() {
    state.inShop = true;
    updateShopUI();
    document.getElementById('shop-screen').classList.remove('hidden');
    showMessage("商人：歡迎！用金幣升級你的能力吧。");
}

function leaveShop() {
    document.getElementById('shop-screen').classList.add('hidden');
    nextLevel();
}

function buyHp() {
    if (state.gold >= state.hpPrice) {
        playSound('coin');
        state.gold -= state.hpPrice;
        state.maxHp += 5;
        state.hp += 5; // Heal when max HP increments
        state.hpPrice += 5;
        updateShopUI();
        updateStatus();
    }
}

function buyAtk() {
    if (state.gold >= state.atkPrice) {
        playSound('coin');
        state.gold -= state.atkPrice;
        state.attack += 1;
        state.atkPrice += 5;
        updateShopUI();
        updateStatus();
    }
}

function buyPotionSlot() {
    if (state.gold >= state.potionSlotPrice) {
        playSound('coin');
        state.gold -= state.potionSlotPrice;
        state.maxPotions += 1;
        state.potionSlotPrice += 5;
        updateShopUI();
        updateStatus();
    }
}

function updateShopUI() {
    const hpEl = document.getElementById('shop-maxhp');
    if(hpEl) hpEl.textContent = state.maxHp;
    const atkEl = document.getElementById('shop-atk');
    if(atkEl) atkEl.textContent = state.attack;
    const pEl = document.getElementById('shop-maxpotions');
    if(pEl) pEl.textContent = state.maxPotions;
    
    const priceHp = document.getElementById('price-hp');
    if(priceHp) priceHp.textContent = state.hpPrice;
    const priceAtk = document.getElementById('price-atk');
    if(priceAtk) priceAtk.textContent = state.atkPrice;
    const priceP = document.getElementById('price-potionslot');
    if(priceP) priceP.textContent = state.potionSlotPrice;
    
    const goldEl = document.getElementById('shop-current-gold');
    if(goldEl) goldEl.textContent = state.gold;
    
    const buyHpBtn = document.getElementById('btn-buy-hp');
    if(buyHpBtn) buyHpBtn.disabled = state.gold < state.hpPrice;
    const buyAtkBtn = document.getElementById('btn-buy-atk');
    if(buyAtkBtn) buyAtkBtn.disabled = state.gold < state.atkPrice;
    const buyPBtn = document.getElementById('btn-buy-potionslot');
    if(buyPBtn) buyPBtn.disabled = state.gold < state.potionSlotPrice;
}

function generateMap() {
    state.board = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        const row = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            // Randomly place walls (~20% chance), keep center clear as potential start
            if (Math.random() < 0.2 && !(x === 5 && y === 5)) {
                row.push(TYPES.WALL);
            } else {
                row.push(TYPES.FLOOR);
            }
        }
        state.board.push(row);
    }
    
    // Ensure connectivity using flood fill from center (5, 5)
    let visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));
    let queue = [{x: 5, y: 5}];
    visited[5][5] = true;
    let floorCount = 1;
    
    while (queue.length > 0) {
        let curr = queue.shift();
        let dirs = [{dx: -1, dy: 0}, {dx: 1, dy: 0}, {dx: 0, dy: -1}, {dx: 0, dy: 1}];
        for (let d of dirs) {
            let nx = curr.x + d.dx, ny = curr.y + d.dy;
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                if (!visited[ny][nx] && state.board[ny][nx] === TYPES.FLOOR) {
                    visited[ny][nx] = true;
                    floorCount++;
                    queue.push({x: nx, y: ny});
                }
            }
        }
    }
    
    // Convert unreachable floors to walls
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (state.board[y][x] === TYPES.FLOOR && !visited[y][x]) {
                state.board[y][x] = TYPES.WALL;
            }
        }
    }
    
    // If the reachable area is too small for entities, regenerate
    if (floorCount < 30) {
        generateMap();
    }
}

function getEmptyCell() {
    let x, y;
    let attempts = 0;
    do {
        x = MathUtils.randomInt(0, BOARD_SIZE - 1);
        y = MathUtils.randomInt(0, BOARD_SIZE - 1);
        attempts++;
        if(attempts > 500) break; // Infinite loop safeguard
    } while (state.board[y][x] !== TYPES.FLOOR || hasEntity(x, y));
    return { x, y };
}

function hasEntity(x, y) {
    if (state.playerPos.x === x && state.playerPos.y === y) return true;
    if (state.items.some(item => item.x === x && item.y === y)) return true;
    if (state.monsters.some(m => m.x === x && m.y === y && m.hp > 0)) return true;
    return false;
}

function placeEntities() {
    state.isBossLevel = (state.level % 20 === 0);
    let difficulty = Math.floor((state.level - 1) / 20);
    
    let validPlacement = false;
    let attempts = 0;
    
    while (!validPlacement && attempts < 100) {
        attempts++;
        state.items = [];
        state.monsters = [];
        
        // Pick player position
        const pPos = getEmptyCell();
        state.playerPos = pPos;
        
        // Pick door position
        const doorPos = getEmptyCell();
        
        // Run BFS from player, treating door as wall
        let visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));
        let queue = [pPos];
        visited[pPos.y][pPos.x] = true;
        let reachableFloors = [];
        
        while (queue.length > 0) {
            let curr = queue.shift();
            // curr itself is reachable
            reachableFloors.push(curr);
            
            let dirs = [{dx: -1, dy: 0}, {dx: 1, dy: 0}, {dx: 0, dy: -1}, {dx: 0, dy: 1}];
            for (let d of dirs) {
                let nx = curr.x + d.dx, ny = curr.y + d.dy;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                    let isObstacle = (!state.isBossLevel && nx === doorPos.x && ny === doorPos.y);
                    if (state.board[ny][nx] === TYPES.FLOOR && !visited[ny][nx] && !isObstacle) {
                        visited[ny][nx] = true;
                        queue.push({x: nx, y: ny});
                    }
                }
            }
        }
        
        // Requirements
        const numFood = MathUtils.randomInt(3, 5);
        const numPotions = MathUtils.randomInt(1, 2);
        const numMonsters = MathUtils.randomInt(3, 5);
        
        let neededCells = 0;
        if (state.isBossLevel) {
            neededCells = 1 /* boss */ + numFood + numPotions;
        } else {
            neededCells = 1 /* key */ + numFood + numMonsters + numPotions;
        }
        
        // +1 because player is currently in reachableFloors
        if (reachableFloors.length - 1 >= neededCells) {
            validPlacement = true;
            
            let availableCells = reachableFloors.filter(c => !(c.x === pPos.x && c.y === pPos.y));
            const getRandomReachable = () => {
                const idx = MathUtils.randomInt(0, availableCells.length - 1);
                return availableCells.splice(idx, 1)[0];
            };
            
            if (!state.isBossLevel) {
                state.items.push({ x: doorPos.x, y: doorPos.y, type: 'door' });
                const keyPos = getRandomReachable();
                state.items.push({ x: keyPos.x, y: keyPos.y, type: 'key' });
                
                // Monsters
                for (let i = 0; i < numMonsters; i++) {
                    const mPos = getRandomReachable();
                    state.monsters.push({ 
                        x: mPos.x, y: mPos.y, 
                        hp: 3 + difficulty * 2, maxHp: 3 + difficulty * 2,
                        atk: 1 + difficulty
                    });
                }
            } else {
                // Boss
                const bPos = getRandomReachable();
                state.monsters.push({ 
                    x: bPos.x, y: bPos.y, 
                    hp: 15 + difficulty * 10, maxHp: 15 + difficulty * 10,
                    atk: 2 + difficulty,
                    isBoss: true
                });
            }
            
            // Food
            for (let i = 0; i < numFood; i++) {
                const fPos = getRandomReachable();
                state.items.push({ x: fPos.x, y: fPos.y, type: 'food' });
            }
            
            // Potions
            for (let i = 0; i < numPotions; i++) {
                const pPos = getRandomReachable();
                state.items.push({ x: pPos.x, y: pPos.y, type: 'potion' });
            }
        }
    }
    
    if (!validPlacement) {
        // Safe fallback in case 100 random combinations failed (rare)
        generateMap();
        return placeEntities();
    }
}

function renderBoard() {
    const boardEl = document.getElementById('game-board');
    boardEl.innerHTML = '';
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${x}-${y}`;
            
            if (state.board[y][x] === TYPES.WALL) {
                cell.classList.add('wall');
                cell.textContent = EMOJIS.WALL;
            } else {
                cell.classList.add('floor');
                cell.textContent = EMOJIS.FLOOR; 
            }
            
            boardEl.appendChild(cell);
        }
    }
    
    // Render Items
    state.items.forEach(item => {
        const cell = document.getElementById(`cell-${item.x}-${item.y}`);
        if (cell) {
            cell.textContent = item.type === 'door' ? EMOJIS.DOOR :
                               item.type === 'key' ? EMOJIS.KEY : 
                               item.type === 'potion' ? EMOJIS.POTION : EMOJIS.FOOD;
        }
    });
    
    // Render Monsters
    state.monsters.forEach(m => {
        if (m.hp > 0) {
            const cell = document.getElementById(`cell-${m.x}-${m.y}`);
            if (cell) cell.textContent = m.isBoss ? '👹' : EMOJIS.MONSTER;
        }
    });
    
    // Render Player
    const playerCell = document.getElementById(`cell-${state.playerPos.x}-${state.playerPos.y}`);
    if (playerCell) {
        playerCell.textContent = EMOJIS.PLAYER;
        // Optional: you can add a class to pulse or highlight the player
    }
}

function updateStatus() {
    const levelEl = document.getElementById('level');
    if (levelEl) levelEl.textContent = state.level;
    const hpEl = document.getElementById('hp');
    if(hpEl) hpEl.textContent = state.hp + '/' + state.maxHp;
    document.getElementById('hunger').textContent = state.hunger;
    const potEl = document.getElementById('potions');
    if(potEl) potEl.textContent = state.potions + '/' + state.maxPotions;
    const goldEl = document.getElementById('gold');
    if(goldEl) goldEl.textContent = state.gold;
    const keyStatus = document.getElementById('key-status');
    if (state.hasKey) {
        keyStatus.classList.remove('hidden');
    } else {
        keyStatus.classList.add('hidden');
    }
}

function showMessage(msg) {
    document.getElementById('message-log').textContent = msg;
}

function showGameOver(msg) {
    playSound('gameOver');
    state.gameOver = true;
    showMessage(msg);
    document.getElementById('final-level').textContent = state.level;
    document.getElementById('game-over-screen').classList.remove('hidden');
    updateStatus();
    renderBoard();
}

function restartGame() {
    document.getElementById('game-over-screen').classList.add('hidden');
    initGame();
}

document.addEventListener('keydown', (e) => {
    if (state.gameOver) return;
    
    if (e.key === 'h' || e.key === 'H' || e.key === '1') {
        if (state.potions > 0 && state.hp < state.maxHp) {
            playSound('eat');
            state.potions--;
            state.hp += 10;
            if (state.hp > state.maxHp) state.hp = state.maxHp;
            showMessage(`🧪 喝下藥水！恢復 10 點生命。目前血量 ${state.hp}/${state.maxHp}`);
            updateStatus();
        } else if (state.potions <= 0) {
            showMessage("🧪 沒有可以使用的藥水！");
        } else if (state.hp >= state.maxHp) {
            showMessage("🩸 血量已經是滿的！");
        }
        return;
    }

    let dx = 0, dy = 0;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dy = -1;
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dy = 1;
    else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dx = -1;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dx = 1;
    
    if (dx !== 0 || dy !== 0) {
        // Prevent default scrolling for arrows
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
        handlePlayerMove(dx, dy);
    }
});

function handlePlayerMove(dx, dy) {
    const nx = state.playerPos.x + dx;
    const ny = state.playerPos.y + dy;
    
    // Check bounds
    if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) return;
    
    // Check walls
    if (state.board[ny][nx] === TYPES.WALL) {
        playSound('hurt');
        showMessage("碰壁了！");
        return;
    }
    
    // Decrement hunger for the action
    state.hunger--;
    if (state.hunger < 0) {
        state.hunger = 0;
        state.hp--; // Starving
        if (state.hp <= 0) {
            showGameOver("☠️ 你餓死了... 遊戲結束！");
            return;
        }
    }
    
    // Check monsters
    const monsterIdx = state.monsters.findIndex(m => m.hp > 0 && m.x === nx && m.y === ny);
    if (monsterIdx !== -1) {
        const m = state.monsters[monsterIdx];
        m.hp -= state.attack;
        const dmgTaken = m.atk || 1;
        state.hp -= dmgTaken; // taking counter attack
        
        playSound(m.hp <= 0 ? 'levelUp' : 'hit');
        
        if (state.hp <= 0) {
            state.hp = 0;
            showGameOver("☠️ 你被擊敗了... 遊戲結束！");
            return;
        }
        
        if (m.hp <= 0) {
            if (m.isBoss) {
                state.gold += 50;
                showMessage("⚔️ 你擊敗了 BOSS！出口出現了！");
                state.items.push({ x: m.x, y: m.y, type: 'door' });
                state.hasKey = true;
            } else {
                state.gold += 10;
                showMessage(`⚔️ 你擊敗了怪物！獲得 10 金幣。`);
            }
        } else {
            showMessage(`⚔️ 攻擊了${m.isBoss ? 'BOSS' : '怪物'}！造成 ${state.attack} 傷害。${m.isBoss ? 'BOSS' : '怪物'}剩餘血量: ${m.hp}`);
            playSound('hurt');
        }
        
        updateStatus();
        renderBoard();
        return; // Don't move into monster space this turn
    }
    
    // Check items / door
    const itemIdx = state.items.findIndex(i => i.x === nx && i.y === ny);
    if (itemIdx !== -1) {
        const item = state.items[itemIdx];
        if (item.type === 'door') {
            if (state.hasKey) {
                nextLevel();
                return;
            } else {
                showMessage("🚪 門鎖上了，你需要找到鑰匙！");
                return; // Block movement
            }
        } else if (item.type === 'key') {
            playSound('levelUp');
            state.hasKey = true;
            showMessage("🔑 找到了鑰匙！現在可以去開門了！");
            state.items.splice(itemIdx, 1);
        } else if (item.type === 'food') {
            playSound('eat');
            state.hunger += 10;
            if(state.hunger > state.maxHunger) state.hunger = state.maxHunger;
            showMessage("🍖 找到了食物！飢餓度 +10。");
            state.items.splice(itemIdx, 1);
        } else if (item.type === 'potion') {
            if (state.potions < state.maxPotions) {
                playSound('eat');
                state.potions++;
                showMessage("🧪 撿起了一瓶藥水！按 'H' 或是 '1' 鍵使用。");
                state.items.splice(itemIdx, 1);
            } else {
                playSound('hurt');
                showMessage("🧪 藥水欄位已滿，無法撿起多餘的藥水！");
            }
        }
    } else {
        // Just empty space
        playSound('move');
        showMessage("你向前移動。");
    }
    
    // Update player position
    state.playerPos.x = nx;
    state.playerPos.y = ny;
    
    if (state.isBossLevel) {
        moveBoss();
    }
    
    updateStatus();
    renderBoard();
}

function moveBoss() {
    if (state.gameOver) return;
    const bossIdx = state.monsters.findIndex(m => m.isBoss && m.hp > 0);
    if (bossIdx === -1) return;
    const boss = state.monsters[bossIdx];
    
    const dx = Math.sign(state.playerPos.x - boss.x);
    const dy = Math.sign(state.playerPos.y - boss.y);
    
    let validMoves = [
        {x: boss.x + dx, y: boss.y},
        {x: boss.x, y: boss.y + dy}
    ].filter(m => m.x !== boss.x || m.y !== boss.y);
    
    for (let m of validMoves) {
        if (m.x === state.playerPos.x && m.y === state.playerPos.y) {
            playSound('hurt');
            state.hp -= boss.atk;
            showMessage(`👹 BOSS 攻擊了你！受到 ${boss.atk} 傷害。`);
            if (state.hp <= 0) {
                state.hp = 0;
                showGameOver("☠️ 你被 BOSS 擊敗了... 遊戲結束！");
            }
            return;
        }
    }
    
    for (let m of validMoves) {
        if (m.x >= 0 && m.x < BOARD_SIZE && m.y >= 0 && m.y < BOARD_SIZE) {
            if (state.board[m.y][m.x] === TYPES.FLOOR) {
                boss.x = m.x;
                boss.y = m.y;
                return;
            }
        }
    }
}

// Start game
document.addEventListener('DOMContentLoaded', () => {
    const volSlider = document.getElementById('volume-slider');
    if (volSlider) {
        masterGainNode.gain.value = parseFloat(volSlider.value);
        volSlider.addEventListener('input', (e) => {
            masterGainNode.gain.value = parseFloat(e.target.value);
            if (audioCtx.state === 'suspended') audioCtx.resume();
        });
    }
    initGame();
});

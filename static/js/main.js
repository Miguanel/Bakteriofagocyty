import { state, randomizePlayerAngle, initializeDecks, drawCard } from './GameState.js';
import { TURN_DURATION, UNIT_TYPES, INCOME_PER_TURN, PHASES } from './constants.js';
import { gameContainer, canvas, ctx } from './Canvas.js';
import { resolveCollisions, resolveCircularBounds, resolveRectangularBounds } from './Physics.js';
import { drawUnitVisuals, drawVectorArrow } from './Graphics.js';
import { initDragAndDrop, updateUI, showDamageNumber, renderHands } from './UI.js';
import { spawnEnemyTurn } from './AI.js';
import { labLoop, handleLabInteraction } from './Lab.js';
import { Unit } from './Unit.js';


const phaseLabel = document.getElementById('phase-indicator');
const actionBtn = document.getElementById('action-btn');

// --- PRZYCISK: PAUZA ---
const pauseLabBtn = document.createElement('button');
pauseLabBtn.id = 'pause-lab-btn';
pauseLabBtn.innerHTML = "⏸️ PAUZA";
pauseLabBtn.style.position = 'absolute';
pauseLabBtn.style.left = (canvas.width / 2 + 220) + 'px';
pauseLabBtn.style.top = (canvas.height / 2 - 20) + 'px';
pauseLabBtn.style.padding = '10px 15px';
pauseLabBtn.style.zIndex = '100';
pauseLabBtn.style.background = '#3498db';
pauseLabBtn.style.color = '#fff';
pauseLabBtn.style.border = '2px solid #2980b9';
pauseLabBtn.style.borderRadius = '8px';
pauseLabBtn.style.cursor = 'pointer';
pauseLabBtn.style.fontWeight = 'bold';
pauseLabBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
pauseLabBtn.title = "Zatrzymaj ruch na szalce";
gameContainer.appendChild(pauseLabBtn);

// --- NOWY PRZYCISK: POBIERZ (POD PAUZĄ) ---
const extractBtn = document.createElement('button');
extractBtn.id = 'extract-btn'; // Ważne dla Lab.js
extractBtn.innerHTML = "📥 POBIERZ";
extractBtn.style.position = 'absolute';
extractBtn.style.left = (canvas.width / 2 + 220) + 'px';
extractBtn.style.top = (canvas.height / 2 + 40) + 'px'; // 60px poniżej pauzy
extractBtn.style.padding = '10px 15px';
extractBtn.style.zIndex = '100';
extractBtn.style.background = '#27ae60';
extractBtn.style.color = '#fff';
extractBtn.style.border = '2px solid #2ecc71';
extractBtn.style.borderRadius = '8px';
extractBtn.style.cursor = 'pointer';
extractBtn.style.fontWeight = 'bold';
extractBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
extractBtn.title = "Kliknij jednostkę, aby pobrać ją do talii";
gameContainer.appendChild(extractBtn);

let GAME_MODE = 'LAB';

initializeDecks();
randomizePlayerAngle();

state.phase = 'LAB_MODE';
state.units = [];
state.playerHand = [...state.playerDeck, ...state.playerHand];
state.playerDeck = [];
state.playerDiscard = [];
state.isLabPaused = false;
state.isExtractMode = false; // Nowy stan
if (!state.energyDrops) state.energyDrops = [];

if(state.units.length === 0) {
    state.units.push(new Unit(300, 300, 'bacteria', 'player', 0));
    state.units.push(new Unit(400, 300, 'virus', 'player', 0));
}

renderHands();
updateUI();
initDragAndDrop();

actionBtn.innerText = "PRZEJDŹ DO WALKI";
phaseLabel.innerText = "LABORATORIUM: MODYFIKACJA";
phaseLabel.style.color = "#00ffea";

pauseLabBtn.addEventListener('click', () => {
    state.isLabPaused = !state.isLabPaused;
    pauseLabBtn.innerHTML = state.isLabPaused ? "▶️ WZNÓW" : "⏸️ PAUZA";
    pauseLabBtn.style.background = state.isLabPaused ? '#e74c3c' : '#3498db';
    pauseLabBtn.style.borderColor = state.isLabPaused ? '#c0392b' : '#2980b9';
});

extractBtn.addEventListener('click', () => {
    state.isExtractMode = !state.isExtractMode;
    if (state.isExtractMode) {
        extractBtn.innerHTML = "🎯 WYBIERZ";
        extractBtn.style.background = '#f1c40f';
        extractBtn.style.color = '#2c3e50';
    } else {
        extractBtn.innerHTML = "📥 POBIERZ";
        extractBtn.style.background = '#27ae60';
        extractBtn.style.color = '#fff';
    }
});

actionBtn.addEventListener('click', () => {
    if (state.phase === 'LAB_MODE') {
        GAME_MODE = 'BATTLE';

        pauseLabBtn.style.display = 'none';
        extractBtn.style.display = 'none';
        state.isExtractMode = false;

        // "Bezpieczny" dochód laboratoryjny
        state.playerIncome = state.units.reduce((sum, u) => sum + (UNIT_TYPES[u.type].income || 0) + (u.traits.photosynthesis || 0), 0);
        state.storedLabUnits = [...state.units];
        state.units = [];
        state.energyDrops = [];

        state.playerDeck = [...state.playerHand];
        state.playerHand = [];
        state.playerDiscard = [];
        state.playerDeck.sort(() => Math.random() - 0.5);

        for(let i=0; i<3; i++) drawCard('player');

        state.playerATP = 10;
        state.enemyATP = 10;
        state.playerHP = 100;
        state.enemyHP = 100;

        state.phase = PHASES.PLAYER_PLANNING;
        actionBtn.innerText = "ROZPOCZNIJ ATAK";
        phaseLabel.innerText = "TWÓJ RUCH: PLANOWANIE";
        phaseLabel.style.color = "#f1c40f";

        renderHands();
        updateUI();
    }
    else if (state.phase === PHASES.PLAYER_PLANNING) {
        state.phase = PHASES.PLAYER_COMBAT;
        state.selectedUnit = null;
        state.dragPreview = null;
    }
});
function drawArena() {
    ctx.save();
    // Ciemne tło bitewne
    ctx.fillStyle = 'rgba(15, 20, 25, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Delikatna siatka taktyczna
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for(let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for(let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Krwista, czerwona ramka dookoła pola walki
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    ctx.restore();
}
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (state.phase === 'LAB_MODE') {
        labLoop(deltaTime);
        if (state.dragPreview) drawDragPreview();
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawArena();
        switch (state.phase) {
            case PHASES.PLAYER_PLANNING:
                phaseLabel.innerText = "TWÓJ RUCH: PLANOWANIE";
                phaseLabel.style.color = "#f1c40f";
                actionBtn.disabled = false;
                actionBtn.innerText = "ROZPOCZNIJ ATAK";
                break;
            case PHASES.PLAYER_COMBAT:
                phaseLabel.innerText = "TWOJE JEDNOSTKI ATAKUJĄ!";
                phaseLabel.style.color = "#00ffea";
                actionBtn.disabled = true;
                runPhysics(deltaTime);
                state.turnTimer += deltaTime;
                if (state.turnTimer >= TURN_DURATION) {
                    const isGameOver = resolvePlayerCombat();
                    state.turnTimer = 0;
                    if (!isGameOver) state.phase = PHASES.ENEMY_PLANNING;
                }
                break;
            case PHASES.ENEMY_PLANNING:
                phaseLabel.innerText = "RUCH WROGA...";
                phaseLabel.style.color = "#e74c3c";
                if (!state.isAiProcessing) {
                    state.isAiProcessing = true;
                    state.enemyATP += 5;
                    updateUI();
                    spawnEnemyTurn().then(() => {
                        state.isAiProcessing = false;
                        state.phase = PHASES.ENEMY_COMBAT;
                    });
                }
                break;
            case PHASES.ENEMY_COMBAT:
                phaseLabel.innerText = "WRÓG KONTRATAKUJE!";
                phaseLabel.style.color = "#ff0055";
                runPhysics(deltaTime);
                state.turnTimer += deltaTime;
                if (state.turnTimer >= TURN_DURATION) {
                    const isGameOver = resolveEnemyCombat();
                    state.turnTimer = 0;
                    if (!isGameOver) {
                        // NOWOŚĆ: Generowanie ATP przez jednostki żyjące na samej Arenie
                        const battleIncome = state.units.reduce((sum, u) => {
                            return sum + (u.owner === 'player' && !u.isDormant ? (UNIT_TYPES[u.type].income || 0) + (u.traits.photosynthesis || 0) : 0);
                        }, 0);
                        const totalIncome = 5 + (state.playerIncome || 0) + battleIncome;

                        state.playerATP += totalIncome;
                        showDamageNumber(`+${totalIncome} ATP`, null, null, '#2ecc71');
                        drawCard('player');
                        drawCard('enemy');
                        state.phase = PHASES.PLAYER_PLANNING;
                        renderHands();
                        updateUI();
                    }
                }
                break;
        }

        state.units.forEach(u => u.draw());
        state.energyDrops.forEach(drop => drop.draw(ctx));

        if (state.phase === PHASES.PLAYER_PLANNING && state.dragPreview) drawDragPreview();
    }
    requestAnimationFrame(gameLoop);
}

function runPhysics(deltaTime) {
    const STEPS = 4;
    const subDeltaTime = deltaTime / STEPS;
    for (let i = 0; i < STEPS; i++) {
        resolveCollisions();

        // Używamy prostokątnej fizyki podczas walki!
        resolveRectangularBounds();

        state.units.forEach(u => u.update(subDeltaTime, 1.0/STEPS));
    }
    state.units = state.units.filter(u => u.hp > 0 || (u.type === 'tardigrade' && u.isDormant));

    if (state.phase !== 'LAB_MODE') {
        collectEnergyDrops();
    }
}

function collectEnergyDrops() {
    for (let i = state.energyDrops.length - 1; i >= 0; i--) {
        const drop = state.energyDrops[i];
        if (drop.pickupDelay > 0) continue;

        let collected = false;

        for (const u of state.units) {
            if (u.hp > 0 && !u.isDormant) {
                const dist = Math.hypot(u.x - drop.x, u.y - drop.y);

                if (dist < u.radius + drop.radius) {
                    if (u.owner === 'player') {
                        state.playerATP += drop.amount;
                        showDamageNumber(`+${drop.amount} ATP`, drop.x, drop.y, '#f1c40f');
                    } else {
                        state.enemyATP += drop.amount;
                        showDamageNumber(`+${drop.amount} ATP`, drop.x, drop.y, '#e84118');
                    }
                    collected = true;
                    break;
                }
            }
        }

        if (collected) {
            state.energyDrops.splice(i, 1);
            updateUI();
        }
    }
}

function resolvePlayerCombat() {
    let damage = 0;
    state.units.forEach(u => {
        if (u.owner === 'player' && u.hp > 0 && !u.isDormant) {
            damage += u.atk;
            if (u.traits.kamikaze) u.hp = 0;
        }
    });
    if (damage > 0) { state.enemyHP -= damage; showDamageNumber(damage, 200, 50, '#ff7675'); }
    return checkWinCondition();
}

function resolveEnemyCombat() {
    let damage = 0;
    state.units.forEach(u => {
        if (u.owner === 'enemy' && u.hp > 0 && !u.isDormant) {
            damage += u.atk;
            if (u.traits.kamikaze) u.hp = 0;
        }
    });
    if (damage > 0) { state.playerHP -= damage; showDamageNumber(damage, 600, 50, '#00cec9'); }
    return checkWinCondition();
}

function checkWinCondition() {
    if (state.playerHP <= 0 || state.enemyHP <= 0) {
        alert((state.playerHP <= 0 ? "PRZEGRANA!" : "ZWYCIĘSTWO!") + " Powrót do laboratorium.");
        GAME_MODE = 'LAB';
        state.phase = 'LAB_MODE';

        state.units = [...state.storedLabUnits];
        state.storedLabUnits = [];
        state.playerHand = [...state.playerHand, ...state.playerDeck, ...(state.playerDiscard || [])];
        state.playerDeck = [];
        state.playerDiscard = [];

        state.energyDrops = [];

        pauseLabBtn.style.display = 'block';
        extractBtn.style.display = 'block';
        state.isLabPaused = false;
        state.isExtractMode = false;
        pauseLabBtn.innerHTML = "⏸️ PAUZA";
        pauseLabBtn.style.background = '#3498db';
        extractBtn.innerHTML = "📥 POBIERZ";
        extractBtn.style.background = '#27ae60';

        actionBtn.disabled = false;
        actionBtn.innerText = "PRZEJDŹ DO WALKI";
        phaseLabel.innerText = "LABORATORIUM: MODYFIKACJA";
        phaseLabel.style.color = "#00ffea";
        renderHands();
        updateUI();
        return true;
    }
    updateUI();
    return false;
}

function drawDragPreview() {
    const { x, y, category, validTarget, targetUnit, type } = state.dragPreview;
    if (category === 'unit') {
        const previewUnit = { x, y, type, owner: 'player', atk: UNIT_TYPES[type].atk, hp: UNIT_TYPES[type].hp, baseColor: UNIT_TYPES[type].color, factionColor: '#00a8ff', isDormant: false };
        drawUnitVisuals(previewUnit, 0.6, false);
        if (state.phase !== 'LAB_MODE') drawVectorArrow(x, y, state.nextSpawnAngle, 0.7);
    } else if (category === 'mutation' && validTarget && targetUnit) {
        ctx.save(); ctx.strokeStyle = "#00ff00"; ctx.lineWidth = 3; ctx.setLineDash([5, 3]); ctx.beginPath();
        ctx.arc(targetUnit.x, targetUnit.y, targetUnit.radius + 8, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
}

function getTouchPos(e) { return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }; }

canvas.addEventListener('mousedown', (e) => { if (state.phase === 'LAB_MODE') handleLabInteraction('mousedown', e); });
canvas.addEventListener('mousemove', (e) => { if (state.phase === 'LAB_MODE') handleLabInteraction('mousemove', e); });
canvas.addEventListener('mouseup',   (e) => { if (state.phase === 'LAB_MODE') handleLabInteraction('mouseup', e); });

canvas.addEventListener('touchstart', (e) => {
    if (state.phase === 'LAB_MODE') { e.preventDefault(); handleLabInteraction('mousedown', getTouchPos(e)); }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (state.phase === 'LAB_MODE') { e.preventDefault(); handleLabInteraction('mousemove', getTouchPos(e)); }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    if (state.phase === 'LAB_MODE') { e.preventDefault(); handleLabInteraction('mouseup', { clientX: 0, clientY: canvas.height }); }
}, { passive: false });

requestAnimationFrame(gameLoop);
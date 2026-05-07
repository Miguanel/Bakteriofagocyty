import { state, initializeDecks, drawMutations } from './GameState.js';
import { canvas, ctx } from './Canvas.js';
import { resolveCollisions, resolveRectangularBounds } from './Physics.js';
import { handleLabInteraction, labLoop } from './Lab.js';
import { StepManager } from './StepManager.js';
import { WindowManager } from './WindowManager.js';

const startModal = document.getElementById('start-modal');
const gameUi = document.getElementById('game-ui');
const btnPve = document.getElementById('btn-pve');
const btnPvp = document.getElementById('btn-pvp');
const btnStartGame = document.getElementById('start-game-btn');
const p1Input = document.getElementById('p1-name');
const p2Input = document.getElementById('p2-name');
const actionBtn = document.getElementById('action-btn');

btnPve.addEventListener('click', () => { state.gameMode = 'pve'; btnPve.classList.add('selected'); btnPvp.classList.remove('selected'); p2Input.value = 'AI'; p2Input.disabled = true; });
btnPvp.addEventListener('click', () => { state.gameMode = 'pvp'; btnPvp.classList.add('selected'); btnPve.classList.remove('selected'); p2Input.value = 'Czerwony'; p2Input.disabled = false; });

btnStartGame.addEventListener('click', () => {
    state.p1Name = p1Input.value || 'Niebieski';
    state.p2Name = p2Input.value || (state.gameMode === 'pve' ? 'AI' : 'Czerwony');
    document.getElementById('player-name-label').innerText = state.p1Name;
    document.getElementById('enemy-name-label').innerText = state.p2Name;

    startModal.style.display = 'none';
    gameUi.style.display = 'block';

    initializeGame();
});

function initializeGame() {
    initializeDecks();
    drawMutations('player', 6);
    drawMutations('enemy', 6);
    StepManager.initFlow();
}

actionBtn.addEventListener('click', () => {
    StepManager.advance();
});

// --- OBSŁUGA BOCZNEGO PRZYCISKU (ROZWIŃ PANEL) ---
const btnDetails = document.getElementById('btn-details');
const detailsPanel = document.getElementById('unit-list-panel');

if(btnDetails) {
    btnDetails.addEventListener('click', () => {
        if (detailsPanel.style.display === 'none') {
            detailsPanel.style.display = 'flex';
            btnDetails.style.borderColor = "var(--active-color)";
            btnDetails.innerText = "📜 ZWIŃ";
        } else {
            detailsPanel.style.display = 'none';
            btnDetails.style.borderColor = "#7f8c8d";
            btnDetails.innerText = "📜 ROZWIŃ";
        }
    });
}

// --- PĘTLA GRY ---
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if(state.phase === 'START_SCREEN') { requestAnimationFrame(gameLoop); return; }

    if (state.phase.startsWith('LAB_')) {
        state.units = state.labUnits[state.activePlayerId] || [];
        labLoop(deltaTime);
    } else {
        state.units = state.battleUnits || [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawArena();

        if (state.phase === 'COMBAT') {
            runPhysics(deltaTime);
            state.turnTimer += deltaTime;

            const p1Alive = state.battleUnits.some(u => u.owner === 'player' && u.hp > 0 && !u.isDormant);
            const p2Alive = state.battleUnits.some(u => u.owner === 'enemy' && u.hp > 0 && !u.isDormant);

            if ((!p1Alive || !p2Alive) || state.turnTimer >= 15000) {
                StepManager.resolveCombatEnd();
            }
        }

        state.battleUnits.forEach(u => u.draw());
        state.energyDrops.forEach(drop => drop.draw(ctx));
    }
    requestAnimationFrame(gameLoop);
}

function drawArena() {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 20, 25, 0.9)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    ctx.restore();
}

function runPhysics(deltaTime) {
    const STEPS = 4;
    const subDeltaTime = deltaTime / STEPS;
    for (let i = 0; i < STEPS; i++) {
        resolveCollisions();
        resolveRectangularBounds();
        state.battleUnits.forEach(u => u.update(subDeltaTime, 1.0/STEPS));
    }
    state.battleUnits = state.battleUnits.filter(u => u.hp > 0 || (u.type === 'tardigrade' && u.isDormant));
}

// Obsługa ukrywania Tooltipu po wyjechaniu poza canvas
document.addEventListener('mousemove', (e) => {
    if (state.phase.startsWith('LAB_') && e.target.id !== 'gameCanvas') {
        const tooltip = document.getElementById('unit-hover-tooltip');
        if (tooltip && !e.target.closest('#unit-hover-tooltip')) {
            tooltip.style.display = 'none';
        }
    }
});

canvas.addEventListener('mousedown', (e) => { if (state.phase.startsWith('LAB_')) handleLabInteraction('mousedown', e); });
canvas.addEventListener('mousemove', (e) => { if (state.phase.startsWith('LAB_')) handleLabInteraction('mousemove', e); });
canvas.addEventListener('mouseup',   (e) => { if (state.phase.startsWith('LAB_')) handleLabInteraction('mouseup', e); });

requestAnimationFrame(gameLoop);
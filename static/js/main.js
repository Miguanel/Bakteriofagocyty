import { state, initializeDecks, drawMutations, SaveManager } from './GameState.js';
import { canvas, ctx } from './Canvas.js';
import { resolveCollisions, resolveArenaBounds } from './Physics.js';
import { handleLabInteraction, labLoop, updateBackgroundLab, renderMinimap } from './Lab.js';
import { StepManager } from './StepManager.js';
import { WindowManager } from './WindowManager.js';
import { Unit } from './Unit.js';
import { renderHands, updateUI, showBioModal, renderTargetingPanel } from './UI.js'; // Dodano targeting panel
import { UNIT_TYPES } from './constants.js';

const startModal = document.getElementById('start-modal');
const gameUi = document.getElementById('game-ui');
const btnPve = document.getElementById('btn-pve');
const btnPvp = document.getElementById('btn-pvp');
const btnStartGame = document.getElementById('start-game-btn');
const btnResumeGame = document.getElementById('resume-game-btn');
const btnSurrenderP1 = document.getElementById('btn-surrender-p1');
const btnSurrenderP2 = document.getElementById('btn-surrender-p2');
const p1Input = document.getElementById('p1-name');
const p2Input = document.getElementById('p2-name');
const actionBtn = document.getElementById('action-btn');

if (btnResumeGame && localStorage.getItem('microArenaSave')) btnResumeGame.style.display = 'inline-block';
if (btnPve) btnPve.addEventListener('click', () => { state.gameMode = 'pve'; btnPve.classList.add('selected'); btnPvp.classList.remove('selected'); p2Input.value = 'AI'; p2Input.disabled = true; });
if (btnPvp) btnPvp.addEventListener('click', () => { state.gameMode = 'pvp'; btnPvp.classList.add('selected'); btnPve.classList.remove('selected'); p2Input.value = 'Czerwony'; p2Input.disabled = false; });
if (btnStartGame) {
    btnStartGame.addEventListener('click', () => {
        state.p1Name = p1Input ? p1Input.value || 'Niebieski' : 'Niebieski';
        state.p2Name = p2Input ? p2Input.value || (state.gameMode === 'pve' ? 'AI' : 'Czerwony') : 'Czerwony';
        const p1Lbl = document.getElementById('player-name-label');
        const p2Lbl = document.getElementById('enemy-name-label');
        if (p1Lbl) p1Lbl.innerText = state.p1Name;
        if (p2Lbl) p2Lbl.innerText = state.p2Name;
        localStorage.removeItem('microArenaSave');
        if (startModal) startModal.style.display = 'none';
        if (gameUi) gameUi.style.display = 'block';
        initializeGame();
    });
}

if (btnResumeGame) {
    btnResumeGame.addEventListener('click', () => {
        if (loadGame()) {
            if (startModal) startModal.style.display = 'none';
            if (gameUi) gameUi.style.display = 'block';
            const p1Lbl = document.getElementById('player-name-label');
            const p2Lbl = document.getElementById('enemy-name-label');
            if (p1Lbl) p1Lbl.innerText = state.p1Name;
            if (p2Lbl) p2Lbl.innerText = state.p2Name;
            document.documentElement.style.setProperty('--active-color', state.activePlayerId === 'player' ? state.p1Color : state.p2Color);
            WindowManager.updateForPhase(state.phase);
            renderHands();
            updateUI();
        } else {
            alert("Błąd odczytu pliku zapisu!");
        }
    });
}

if (btnSurrenderP1) btnSurrenderP1.addEventListener('click', () => StepManager.surrender('player'));
if (btnSurrenderP2) btnSurrenderP2.addEventListener('click', () => StepManager.surrender('enemy'));

function initializeGame() {
    initializeDecks();
    drawMutations('player', 6);
    drawMutations('enemy', 6);
    StepManager.initFlow();
}

if (actionBtn) {
    actionBtn.addEventListener('click', () => {
        if (state.phase === 'COMBAT') {
            if (WindowManager.isAnimating) return;
            state.turnTimeLeft = 60;
            const nextPlayer = state.activePlayerId === 'player' ? 'enemy' : 'player';

            WindowManager.rotateHUD(nextPlayer, () => {
                state.activePlayerId = nextPlayer;
                document.documentElement.style.setProperty('--active-color', state.activePlayerId === 'player' ? state.p1Color : state.p2Color);
                renderHands();
                updateUI();
            });
        } else {
            StepManager.advance();
        }
    });
}

function saveGame() {
    if (state.phase === 'START_SCREEN' || state.gameEnded) return;
    const serializeUnits = (unitsArray) => {
        return unitsArray.map(u => ({ x: u.x, y: u.y, type: u.type, owner: u.owner, angle: u.angle, hp: u.hp, appliedMutations: [...u.appliedMutations] }));
    };
    const stateToSave = {
        gameMode: state.gameMode, p1Name: state.p1Name, p2Name: state.p2Name, p1Color: state.p1Color, p2Color: state.p2Color,
        p1Avatar: state.p1Avatar, p2Avatar: state.p2Avatar, activePlayerId: state.activePlayerId, phase: state.phase,
        playerATP: state.playerATP, enemyATP: state.enemyATP, playerHP: state.playerHP, enemyHP: state.enemyHP,
        pipettes: state.pipettes, decks: state.decks, hands: state.hands, discards: state.discards,
        labUnits: { player: serializeUnits(state.labUnits.player || []), enemy: serializeUnits(state.labUnits.enemy || []) }
    };
    localStorage.setItem('microArenaSave', JSON.stringify(stateToSave));
}

function loadGame() {
    const saved = localStorage.getItem('microArenaSave');
    if (!saved) return false;
    try {
        const data = JSON.parse(saved);
        state.gameMode = data.gameMode; state.p1Name = data.p1Name; state.p2Name = data.p2Name; state.p1Color = data.p1Color; state.p2Color = data.p2Color;
        state.p1Avatar = data.p1Avatar; state.p2Avatar = data.p2Avatar; state.activePlayerId = data.activePlayerId; state.phase = data.phase;
        state.playerATP = data.playerATP; state.enemyATP = data.enemyATP; state.playerHP = data.playerHP; state.enemyHP = data.enemyHP;
        state.pipettes = data.pipettes; state.decks = data.decks; state.hands = data.hands; state.discards = data.discards;

        const reconstructUnits = (arr) => arr.map(uData => {
            const unit = new Unit(uData.x, uData.y, uData.type, uData.owner, uData.angle);
            if (uData.appliedMutations) { uData.appliedMutations.forEach(m => unit.applyGeneticCard(m)); }
            unit.hp = uData.hp; return unit;
        });
        state.labUnits.player = reconstructUnits(data.labUnits.player);
        state.labUnits.enemy = reconstructUnits(data.labUnits.enemy);

        // Zabezpieczenie przed usunięciem areny po odświeżeniu strony:
        state.battleUnits = []; // Przywrócimy rdzenie po wejściu do fazy walki
        return true;
    } catch (e) {
        console.error("Uszkodzony zapis:", e);
        return false;
    }
}
document.addEventListener('gameStateChanged', () => saveGame());

const btnDetails = document.getElementById('btn-details');
const detailsPanel = document.getElementById('unit-list-panel');
if(btnDetails && detailsPanel) {
    btnDetails.addEventListener('click', () => {
        if (detailsPanel.style.display === 'none') {
            detailsPanel.style.display = 'flex'; btnDetails.style.borderColor = "var(--active-color)"; btnDetails.innerText = "📜 ZWIŃ";
        } else {
            detailsPanel.style.display = 'none'; btnDetails.style.borderColor = "#7f8c8d"; btnDetails.innerText = "📜 ROZWIŃ";
        }
    });
}

// --- PĘTLA GRY ---
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if(state.phase === 'START_SCREEN' || state.gameEnded) { requestAnimationFrame(gameLoop); return; }

    const minimap1 = document.getElementById('minimapCanvas-p1');
    const minimap2 = document.getElementById('minimapCanvas-p2');

    // Mimo że rysujemy na nich radar w tle, wyłączamy je w HTML, bo są kopiowane do Unit.js
    if(minimap1) minimap1.style.display = 'none';
    if(minimap2) minimap2.style.display = 'none';

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

            if (!WindowManager.isAnimating) {
                state.turnTimeLeft -= deltaTime / 1000;
                const phaseIndicator = document.getElementById('phase-indicator');
                if (phaseIndicator) {
                    phaseIndicator.innerText = `FAZA: STARCIE ⏳ ${Math.max(0, Math.ceil(state.turnTimeLeft))}s | TURA: ${state.activePlayerId === 'player' ? state.p1Name : state.p2Name}`;
                    phaseIndicator.style.color = state.activePlayerId === 'player' ? state.p1Color : state.p2Color;
                }

                if (state.turnTimeLeft <= 0) {
                    state.turnTimeLeft = 60;
                    const nextPlayer = state.activePlayerId === 'player' ? 'enemy' : 'player';

                    WindowManager.rotateHUD(nextPlayer, () => {
                        state.activePlayerId = nextPlayer;
                        document.documentElement.style.setProperty('--active-color', state.activePlayerId === 'player' ? state.p1Color : state.p2Color);

                        renderHands();
                        updateUI();
                        StepManager.triggerSplash("ZMIANA TURY", `TERAZ GRA: ${state.activePlayerId === 'player' ? state.p1Name : state.p2Name}`, state.activePlayerId === 'player' ? state.p1Color : state.p2Color);
                    });
                }
            }

            if (state.turnTimer >= 4000) {
                state.turnTimer = 0;
                const p1Income = state.labUnits.player.reduce((sum, u) => sum + (UNIT_TYPES[u.type]?.income || 0) + (u.traits.photosynthesis || 0), 0);
                const p2Income = state.labUnits.enemy.reduce((sum, u) => sum + (UNIT_TYPES[u.type]?.income || 0) + (u.traits.photosynthesis || 0), 0);

                state.playerATP += p1Income > 0 ? p1Income : 2;
                state.enemyATP += p2Income > 0 ? p2Income : 2;

                drawMutations('player', 1);
                drawMutations('enemy', 1);

                renderHands(); updateUI(); renderTargetingPanel();
            }
        }

        updateBackgroundLab(deltaTime);
        renderMinimap();

        state.battleUnits.forEach(u => u.draw());
    }
    requestAnimationFrame(gameLoop);
}

function drawArena() {
    ctx.save();
    const cx1 = 280, cx2 = 520, cy = 225, r = 170;
    const distHalf = (cx2 - cx1) / 2;
    const h = Math.sqrt(r * r - distHalf * distHalf);
    const aTop2 = Math.atan2(-h, -distHalf);
    const aBot2 = Math.atan2(h, -distHalf);
    const aBot1 = Math.atan2(h, distHalf);
    const aTop1 = Math.atan2(-h, distHalf);

    ctx.beginPath();
    ctx.arc(cx2, cy, r, aTop2, aBot2, false);
    ctx.arc(cx1, cy, r, aBot1, aTop1, false);
    ctx.closePath();

    ctx.fillStyle = 'rgba(15, 20, 25, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.7)';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(231, 76, 60, 0.5)';
    ctx.stroke();
    ctx.restore();
}

function runPhysics(deltaTime) {
    const STEPS = 4;
    const subDeltaTime = deltaTime / STEPS;
    for (let i = 0; i < STEPS; i++) {
        resolveCollisions();
        resolveArenaBounds();
        state.battleUnits.forEach(u => u.update(subDeltaTime, 1.0/STEPS));
    }
    state.battleUnits = state.battleUnits.filter(u => u.hp > 0 || (u.type === 'tardigrade' && u.isDormant));
}

if (canvas) {
    canvas.addEventListener('click', (e) => {
        if (!state.phase.startsWith('LAB_')) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            for (let i = state.battleUnits.length - 1; i >= 0; i--) {
                const u = state.battleUnits[i];
                if (Math.hypot(u.x - mx, u.y - my) <= u.radius + 10) {
                    showBioModal({ category: 'unit', type: u.type, unitObj: u });
                    break;
                }
            }
        }
    });

    canvas.addEventListener('mousedown', (e) => { if (state.phase.startsWith('LAB_')) handleLabInteraction('mousedown', e); });
    canvas.addEventListener('mousemove', (e) => {
        if (state.phase.startsWith('LAB_')) {
            handleLabInteraction('mousemove', e);
        } else {
            const tooltip = document.getElementById('unit-hover-tooltip');
            if (tooltip && !e.target.closest('#unit-hover-tooltip')) tooltip.style.display = 'none';
        }
    });
    canvas.addEventListener('mouseup',   (e) => { if (state.phase.startsWith('LAB_')) handleLabInteraction('mouseup', e); });
}

requestAnimationFrame(gameLoop);

window.saveGenome = function(slotIndex) {
    const id = state.activePlayerId;
    const playerName = id === 'player' ? state.p1Name : state.p2Name;

    const factionData = {
        labUnits: state.labUnits[id].map(u => ({ x: u.x, y: u.y, type: u.type, owner: u.owner, angle: u.angle, hp: u.hp, appliedMutations: [...u.appliedMutations] })),
        hands: state.hands[id],
        decks: state.decks[id],
        pipettes: state.pipettes[id]
    };

    SaveManager.saveToSlot(playerName, slotIndex, factionData);

    const splash = document.createElement('div');
    splash.className = 'damage-float';
    splash.innerText = `💾 PROFIL ZAPISANY (SLOT ${slotIndex})!`;
    splash.style.left = '50%'; splash.style.top = '50%';
    splash.style.transform = 'translate(-50%, -50%)';
    splash.style.fontSize = '30px'; splash.style.color = '#f1c40f';
    document.body.appendChild(splash);
    setTimeout(() => splash.remove(), 2000);
};

window.loadGenome = function(slotIndex) {
    const id = state.activePlayerId;
    const playerName = id === 'player' ? state.p1Name : state.p2Name;

    const parsed = SaveManager.loadFromSlot(playerName, slotIndex);
    if(parsed) {
        const reconstructUnits = (arr) => arr.map(uData => {
            const unit = new Unit(uData.x, uData.y, uData.type, uData.owner, uData.angle);
            if (uData.appliedMutations) uData.appliedMutations.forEach(m => unit.applyGeneticCard(m));
            unit.hp = uData.hp;
            return unit;
        });

        state.labUnits[id] = reconstructUnits(parsed.labUnits);
        state.hands[id] = parsed.hands;
        state.decks[id] = parsed.decks;
        state.pipettes[id] = parsed.pipettes;

        import('./UI.js').then(ui => { ui.renderHands(); ui.updateUI(); });

        const splash = document.createElement('div');
        splash.className = 'damage-float';
        splash.innerText = `📂 WCZYTANO BAZĘ (SLOT ${slotIndex})!`;
        splash.style.left = '50%'; splash.style.top = '50%';
        splash.style.transform = 'translate(-50%, -50%)';
        splash.style.fontSize = '30px'; splash.style.color = '#00cec9';
        document.body.appendChild(splash);
        setTimeout(() => splash.remove(), 2000);
    } else {
        alert(`Brak zapisanego genomu dla gracza ${playerName} w slocie ${slotIndex}!`);
    }
};
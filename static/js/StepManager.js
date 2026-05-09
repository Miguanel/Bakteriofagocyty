import { state, drawMutations, applyTurnIncome } from './GameState.js';
import { updateUI, renderHands, initDragAndDrop } from './UI.js';
import { spawnEnemyTurn } from './AI.js';
import { WindowManager } from './WindowManager.js';
import { Unit } from './Unit.js';

export const StepManager = {
    flow: [], currentIndex: 0,

    initFlow() {
        state.p1Color = document.getElementById('p1-color').value;
        state.p2Color = document.getElementById('p2-color').value;
        state.p1Avatar = document.getElementById('p1-avatar-display').innerText;
        state.p2Avatar = document.getElementById('p2-avatar-display').innerText;

        const mapTypes = ['CIRCLE', 'MITOSIS', 'OBSTACLES'];
        state.currentMap = mapTypes[Math.floor(Math.random() * mapTypes.length)];
        state.gameEnded = false;

        if (state.gameMode === 'pvp') {
            this.flow = ['LAB_P1', 'LAB_P2', 'PLANNING_P1', 'PLANNING_P2', 'COMBAT'];
        } else {
            this.flow = ['LAB_P1', 'PLANNING_P1', 'PLANNING_AI', 'COMBAT'];
        }

        this.currentIndex = 0;
        this.executeCurrentStep();
    },

    advance() {
        this.currentIndex++;
        if (this.currentIndex >= this.flow.length) {
            this.currentIndex = this.flow.indexOf('PLANNING_P1');
        }
        this.executeCurrentStep();
    },

    executeCurrentStep() {
        const nextPhase = this.flow[this.currentIndex];
        state.phase = nextPhase;

        let targetPlayerId = state.activePlayerId;
        if (nextPhase.endsWith('P1') || nextPhase === 'PLANNING_AI') {
            targetPlayerId = 'player';
        } else if (nextPhase.endsWith('P2')) {
            targetPlayerId = 'enemy';
        }

        WindowManager.rotateHUD(targetPlayerId, () => {
            state.activePlayerId = targetPlayerId;
            const activeColor = state.activePlayerId === 'player' ? state.p1Color : state.p2Color;
            document.documentElement.style.setProperty('--active-color', activeColor);

            WindowManager.updateForPhase(nextPhase);

            switch (nextPhase) {
                case 'LAB_P1':
                    this.triggerSplash(state.p1Name, "GENETYKA", state.p1Color);
                    this.showIntermission(state.p1Name, state.p1Avatar, "Czas na modyfikację genetyczną na szalce.", () => this.setupLabPhase());
                    break;
                case 'LAB_P2':
                    this.triggerSplash(state.p2Name, "GENETYKA", state.p2Color);
                    this.showIntermission(state.p2Name, state.p2Avatar, "Rozbuduj swoje mikroorganizmy.", () => this.setupLabPhase());
                    break;
                case 'PLANNING_P1':
                    const p1Income = applyTurnIncome('player');
                    drawMutations('player', 1);
                    this.triggerSplash(state.p1Name, `TAKTYKA\n+${p1Income} ATP`, state.p1Color);
                    this.setupPlanningPhase();
                    break;
                case 'PLANNING_P2':
                    const p2Income = applyTurnIncome('enemy');
                    drawMutations('enemy', 1);
                    this.triggerSplash(state.p2Name, `TAKTYKA\n+${p2Income} ATP`, state.p2Color);
                    this.setupPlanningPhase();
                    break;
                case 'PLANNING_AI':
                    document.getElementById('phase-indicator').innerText = "🤖 ANALIZA DANYCH...";
                    applyTurnIncome('enemy');
                    drawMutations('enemy', 1);
                    spawnEnemyTurn().then(() => this.advance());
                    break;
                case 'COMBAT':
                    this.triggerSplash("ARENA", "STARCIE KWANTOWE", "#f1c40f");
                    this.setupCombatPhase();
                    break;
            }
        });
    },

    setupLabPhase() {
        state.units = state.labUnits[state.activePlayerId];
        renderHands(); updateUI(); initDragAndDrop();
    },

    // --- NAPRAWIONO: Rdzenie baz pojawiają się w idealnych centrach kół w trakcie planowania ---
    spawnCoreBases() {
        if (!state.battleUnits.some(u => u.type === 'core_base' && u.owner === 'player')) {
            const p1Base = new Unit(280, 225, 'core_base', 'player', 0);
            p1Base.hp = state.playerHP; p1Base.maxHp = 500;
            state.battleUnits.push(p1Base);
        }
        if (!state.battleUnits.some(u => u.type === 'core_base' && u.owner === 'enemy')) {
            const p2Base = new Unit(520, 225, 'core_base', 'enemy', 0);
            p2Base.hp = state.enemyHP; p2Base.maxHp = 500;
            state.battleUnits.push(p2Base);
        }
    },

    setupPlanningPhase() {
        this.spawnCoreBases();
        state.units = state.battleUnits;
        renderHands(); updateUI(); initDragAndDrop();
    },

    setupCombatPhase() {
        this.spawnCoreBases();
        state.units = state.battleUnits;
        state.turnTimer = 0;
        state.turnTimeLeft = 60;
        updateUI();
    },

    resolveCombatEnd(loserId) {
        if (state.gameEnded) return;
        state.gameEnded = true;

        const isPlayerWinner = loserId === 'enemy';
        const winnerName = isPlayerWinner ? state.p1Name : state.p2Name;
        const loserName = isPlayerWinner ? state.p2Name : state.p1Name;

        this.triggerSplash("BITWA ZAKOŃCZONA", `${winnerName} ZWYCIĘŻA!`, "#fff");
        localStorage.removeItem('microArenaSave');

        fetch('/api/save_match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: state.gameMode, winner: winnerName, loser: loserName, p1_hp_left: Math.max(0, state.playerHP), p2_hp_left: Math.max(0, state.enemyHP) })
        })
        .then(() => setTimeout(() => location.reload(), 3500))
        .catch(() => setTimeout(() => location.reload(), 3500));
    },

    surrender(loserId) {
        if (state.gameEnded) return;
        state.gameEnded = true;

        const isP1Loser = loserId === 'player';
        const winnerName = isP1Loser ? state.p2Name : state.p1Name;
        const loserName = isP1Loser ? state.p1Name : state.p2Name;

        this.triggerSplash("KAPITULACJA", `${winnerName} DOMINUJE ARENĘ!`, "#ff7675");
        localStorage.removeItem('microArenaSave');

        setTimeout(() => { location.reload(); }, 2500);
    },

    triggerSplash(who, action, color) {
        const el = document.createElement('div');
        el.className = 'phase-splash cosmic-glass';
        el.innerHTML = `
            <div style="font-size:24px; color:${color}; font-weight:900; letter-spacing:4px; margin-bottom:10px;">${who}</div>
            <div style="font-size:36px; color:#fff; text-shadow: 0 0 15px ${color}; white-space: pre-wrap; text-align: center;">${action}</div>
        `;
        el.style.borderTop = `4px solid ${color}`;
        el.style.borderBottom = `4px solid ${color}`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2500);
    },

    showIntermission(name, avatar, text, callback) {
        if (state.gameMode === 'pve' && state.activePlayerId === 'enemy') { callback(); return; }
        const modal = document.getElementById('intermission-modal');
        const titleEl = document.getElementById('intermission-title');
        const avatarEl = document.getElementById('next-player-avatar');
        const textEl = document.getElementById('intermission-text');
        const btn = document.getElementById('intermission-btn');
        if (!modal || !btn) { callback(); return; }

        titleEl.innerText = name;
        avatarEl.innerText = avatar;
        textEl.innerText = text;
        modal.style.display = 'flex';

        const newBtn = btn.cloneNode(true);
        btn.replaceWith(newBtn);
        newBtn.addEventListener('click', () => { modal.style.display = 'none'; callback(); });
    }
};
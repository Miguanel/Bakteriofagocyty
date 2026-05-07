import { state, drawMutations, randomizePlayerAngle } from './GameState.js';
import { updateUI, renderHands, showDamageNumber, initDragAndDrop } from './UI.js';
import { spawnEnemyTurn } from './AI.js';
import { WindowManager } from './WindowManager.js'; // IMPORTUJEMY NOWEGO MANAGERA!

export const StepManager = {
    flow: [], currentIndex: 0,

    initFlow() {
        // Mapowanie ustawień z modala
        state.p1Color = document.getElementById('p1-color').value;
        state.p2Color = document.getElementById('p2-color').value;
        state.p1Avatar = document.getElementById('p1-avatar-display').innerText;
        state.p2Avatar = document.getElementById('p2-avatar-display').innerText;

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
        if (this.currentIndex >= this.flow.length) this.currentIndex = 0;
        this.executeCurrentStep();
    },

    executeCurrentStep() {
        const nextPhase = this.flow[this.currentIndex];
        state.phase = nextPhase;

        // Zmiana aktywnego koloru w CSS
        const activeColor = state.activePlayerId === 'player' ? state.p1Color : state.p2Color;
        document.documentElement.style.setProperty('--active-color', activeColor);

        // Przekazujemy pałeczkę do WindowManager, by ustawił okna pod daną fazę
        WindowManager.updateForPhase(nextPhase);

        switch (nextPhase) {
            case 'LAB_P1':
                state.activePlayerId = 'player';
                this.triggerSplash(state.p1Name, "GENETYKA", state.p1Color);
                this.showIntermission(state.p1Name, state.p1Avatar, "Czas na modyfikację genetyczną.", () => this.setupLabPhase());
                break;
            case 'LAB_P2':
                state.activePlayerId = 'enemy';
                this.triggerSplash(state.p2Name, "GENETYKA", state.p2Color);
                this.showIntermission(state.p2Name, state.p2Avatar, "Rozbuduj swoje mikroorganizmy.", () => this.setupLabPhase());
                break;
            case 'PLANNING_P1':
                state.activePlayerId = 'player';
                this.triggerSplash(state.p1Name, "TAKTYKA", state.p1Color);
                this.setupPlanningPhase();
                break;
            case 'PLANNING_P2':
                state.activePlayerId = 'enemy';
                this.triggerSplash(state.p2Name, "TAKTYKA", state.p2Color);
                this.setupPlanningPhase();
                break;
            case 'PLANNING_AI':
                document.getElementById('phase-indicator').innerText = "🤖 ANALIZA DANYCH...";
                spawnEnemyTurn().then(() => this.advance());
                break;
            case 'COMBAT':
                this.triggerSplash("ARENA", "STARCIE KWANTOWE", "#f1c40f");
                this.setupCombatPhase();
                break;
        }
    },

    setupLabPhase() {
        state.units = state.labUnits[state.activePlayerId]; // Przełącz fizykę na Lab
        renderHands(); updateUI(); initDragAndDrop();
    },

    setupPlanningPhase() {
        state.units = state.battleUnits; // Przełącz fizykę na Arenę
        renderHands(); updateUI(); initDragAndDrop();
    },

    setupCombatPhase() {
        state.units = state.battleUnits;
        state.turnTimer = 0;
        updateUI();
    },

    resolveCombatEnd() {
        let d1 = 0, d2 = 0;
        state.battleUnits.forEach(u => {
            if(u.hp > 0 && !u.isDormant) {
                if(u.owner === 'player') d1 += u.atk; else d2 += u.atk;
            }
        });
        state.enemyHP -= d1; state.playerHP -= d2;

        if (state.playerHP <= 0 || state.enemyHP <= 0) {
            this.triggerSplash("BITWA ZAKOŃCZONA", state.playerHP <= 0 ? "ZWYCIĘSTWO OBCYCH" : "ZWYCIĘSTWO LUDZI", "#fff");
            setTimeout(() => location.reload(), 3000);
            return;
        }

        state.playerATP += 15; state.enemyATP += 15;
        drawMutations('player', 3); drawMutations('enemy', 3);

        state.battleUnits = [];
        this.currentIndex = -1;
        this.advance();
    },

    triggerSplash(who, action, color) {
        const el = document.createElement('div');
        el.className = 'phase-splash';
        el.innerHTML = `<div style="font-size:20px; color:rgba(255,255,255,0.6)">${who}</div><div>${action}</div>`;
        el.style.setProperty('--active-color', color);
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

        if (!modal || !btn) return;

        titleEl.innerText = name;
        avatarEl.innerText = avatar;
        textEl.innerText = text;
        modal.style.display = 'flex';

        const newBtn = btn.cloneNode(true);
        btn.replaceWith(newBtn);

        newBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            callback();
        });
    }
};
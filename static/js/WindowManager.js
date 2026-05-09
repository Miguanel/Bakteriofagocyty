// WindowManager.js
export const WindowManager = {
    isAnimating: false, // Blokada zapobiegająca psuciu animacji

    // --- NOWOŚĆ: Bezpieczna rotacja dolnego interfejsu ---
    rotateHUD(targetPlayerId, callback) {
        if (this.isAnimating) return; // Ignorujemy, jeśli już się kręci

        const bottomHud = document.getElementById('bottom-hud-wrapper');
        const stateModule = import('./GameState.js'); // dynamiczny import by uniknąć pętli

        stateModule.then(({ state }) => {
            if (!bottomHud || state.gameMode !== 'pvp') {
                if (callback) callback();
                return;
            }

            this.isAnimating = true;
            bottomHud.style.opacity = '0'; // Lekkie ściemnienie

            setTimeout(() => {
                if (callback) callback(); // Podmiana kart i danych w tle

                const targetRot = targetPlayerId === 'enemy' ? 180 : 0;
                bottomHud.style.transform = `rotate(${targetRot}deg)`;
                bottomHud.style.opacity = '1'; // Powrót widoczności

                setTimeout(() => {
                    this.isAnimating = false; // Odblokowanie po zakończeniu css transition
                }, 600);
            }, 300);
        });
    },

    updateForPhase(phase) {
        const unitListPanel = document.getElementById('unit-list-panel');
        const targetingPanel = document.getElementById('targeting-panel');
        const dualDeck = document.getElementById('dual-deck-container');
        const actionBtn = document.getElementById('action-btn');
        const surrenderControls = document.getElementById('surrender-controls');
        const phaseIndicator = document.getElementById('phase-indicator');
        const genomeSlots = document.getElementById('genome-slots');

        if (actionBtn) actionBtn.classList.remove('combat-btn');

        if (phase.startsWith('LAB_')) {
            if (unitListPanel) unitListPanel.style.display = 'flex';
            if (targetingPanel) targetingPanel.style.display = 'none';
            if (dualDeck) dualDeck.style.display = 'flex';
            if (genomeSlots) genomeSlots.style.display = 'flex';
            if (actionBtn) actionBtn.innerText = "ZAKOŃCZ BADANIA";
            if (surrenderControls) surrenderControls.style.display = 'none';
            if (phaseIndicator) phaseIndicator.innerText = "FAZA: LABORATORIUM";

        } else if (phase.startsWith('PLANNING_')) {
            if (unitListPanel) unitListPanel.style.display = 'none';
            if (targetingPanel) targetingPanel.style.display = 'block';
            if (dualDeck) dualDeck.style.display = 'flex';
            if (genomeSlots) genomeSlots.style.display = 'none';
            if (actionBtn) actionBtn.innerText = "GOTOWY DO WALKI";
            if (surrenderControls) surrenderControls.style.display = 'none';
            if (phaseIndicator) phaseIndicator.innerText = "FAZA: ROZSTAWIANIE";

        } else if (phase === 'COMBAT') {
            if (unitListPanel) unitListPanel.style.display = 'none';
            if (targetingPanel) targetingPanel.style.display = 'block';
            if (dualDeck) dualDeck.style.display = 'flex';
            if (genomeSlots) genomeSlots.style.display = 'none';
            if (actionBtn) {
                actionBtn.innerText = "🔄 ZMIEŃ RĘKĘ (W LOCIE)";
                actionBtn.classList.add('combat-btn');
            }
            if (surrenderControls) surrenderControls.style.display = 'flex';
            if (phaseIndicator) phaseIndicator.innerText = "FAZA: STARCIE";
        }
    }
};